# Upstash Redis Setup Guide

## Why Upstash?

- **Serverless**: Pay per request, no idle costs
- **Global**: Edge-optimized with low latency
- **Free Tier**: 10,000 commands/day (enough for development)
- **REST API**: Works in edge runtimes (Vercel, Cloudflare)
- **No Connection Pooling Needed**: HTTP-based, not TCP

## Step 1: Create Upstash Account

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up with GitHub or email
3. Verify email

## Step 2: Create Redis Database

1. Click "Create Database"
2. Configure:
   - **Name**: `vibing2-rate-limit`
   - **Type**: Regional (cheaper) or Global (faster)
   - **Region**: Choose closest to your users
     - `us-east-1` for US East Coast
     - `eu-west-1` for Europe
     - `ap-southeast-1` for Asia
   - **TLS**: Enabled (recommended)
   - **Eviction**: allkeys-lru (for rate limiting)

3. Click "Create"

## Step 3: Get Connection Details

1. Click on your database
2. Scroll to "REST API" section
3. Copy:
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**

## Step 4: Add to Environment Variables

### Development (.env.local)
```bash
# Upstash Redis for Rate Limiting
UPSTASH_REDIS_REST_URL=https://xxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==
```

### Production

#### Vercel
```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

#### Railway
1. Go to project → Variables
2. Add:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

#### AWS (EC2/ECS)
```bash
# Add to .env on server
ssh -i key.pem ec2-user@your-instance
vi .env

# Or use AWS Secrets Manager
aws secretsmanager create-secret \
  --name vibing2/upstash \
  --secret-string '{"url":"https://xxx","token":"xxx"}'
```

## Step 5: Verify Setup

### Test Connection
Create `scripts/test-upstash.ts`:

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function test() {
  console.log('🔍 Testing Upstash connection...');

  // Set a test key
  await redis.set('test', 'Hello from Vibing2!');
  console.log('✅ Set test key');

  // Get the key
  const value = await redis.get('test');
  console.log('✅ Got test key:', value);

  // Increment counter
  await redis.incr('test:counter');
  const counter = await redis.get('test:counter');
  console.log('✅ Counter:', counter);

  // Test rate limiting
  await redis.set('ratelimit:test', 1, { ex: 10 }); // Expires in 10s
  const ttl = await redis.ttl('ratelimit:test');
  console.log('✅ TTL:', ttl, 'seconds');

  // Cleanup
  await redis.del('test', 'test:counter', 'ratelimit:test');
  console.log('✅ Cleaned up test keys');

  console.log('🎉 Upstash is working!');
}

test().catch(console.error);
```

Run test:
```bash
npx tsx scripts/test-upstash.ts
```

Expected output:
```
🔍 Testing Upstash connection...
✅ Set test key
✅ Got test key: Hello from Vibing2!
✅ Counter: 1
✅ TTL: 9 seconds
✅ Cleaned up test keys
🎉 Upstash is working!
```

## Step 6: Test Rate Limiting

### Check Rate Limit Status
```bash
# Run dev server
npm run dev

# Test AI endpoint (limited to 3/min)
curl -X POST http://localhost:3000/api/agent/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","content":"test"}],"projectType":"web"}'

# Check headers
curl -i -X POST http://localhost:3000/api/agent/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","content":"test"}],"projectType":"web"}'

# Should see headers:
# X-RateLimit-Limit: 3
# X-RateLimit-Remaining: 2
# X-RateLimit-Reset: 1234567890
```

### Test Rate Limit Exceeded
```bash
# Make 4 requests quickly (limit is 3/min)
for i in {1..4}; do
  curl -X POST http://localhost:3000/api/agent/stream \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"id":"'$i'","role":"user","content":"test"}],"projectType":"web"}'
  echo ""
done

# 4th request should return:
# {
#   "error": "Rate limit exceeded",
#   "message": "Too many requests. Please try again after 3:45:30 PM",
#   "limit": 3,
#   "retryAfter": 60
# }
```

## Rate Limit Configuration

Current limits in `/lib/rate-limit.ts`:

| Limiter | Limit | Window | Endpoints |
|---------|-------|--------|-----------|
| **aiRateLimiter** | 3 requests | 1 minute | /api/agent/stream |
| **authRateLimiter** | 5 requests | 15 minutes | /api/auth/* |
| **saveRateLimiter** | 30 requests | 1 hour | /api/projects/save |
| **apiRateLimiter** | 10 requests | 10 seconds | General API |

### Adjust Limits (if needed)

Edit `/lib/rate-limit.ts`:

```typescript
// More generous for Pro users
export const aiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // Increased from 3 to 10
      analytics: true,
      prefix: 'ratelimit:ai',
    })
  : null;

// Stricter for free users
export const aiRateLimiterFree = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '5 m'), // 3 per 5 minutes
      analytics: true,
      prefix: 'ratelimit:ai:free',
    })
  : null;
```

## Monitoring

### Upstash Dashboard
1. Go to your database in Upstash
2. Click "Metrics" tab
3. View:
   - Commands per second
   - Bandwidth usage
   - Storage used
   - Top commands

### Check Redis Keys
```bash
# Install Redis CLI
npm install -g @upstash/cli

# Connect
upstash redis connect <database-id>

# List rate limit keys
KEYS ratelimit:*

# Check specific user limit
GET ratelimit:ai:user:clxxx123

# Check IP limit
GET ratelimit:auth:ip:192.168.1.1
```

## Cost Estimation

### Free Tier
- 10,000 commands/day
- 256 MB storage
- Enough for:
  - 100-200 active users/day
  - 5,000 AI requests/day (2 commands per request)

### Pricing (if you exceed free tier)
- Pay-as-you-go: $0.20 per 100K commands
- Pro: $10/month (1M commands)
- Team: $60/month (10M commands)

### Monthly Cost Estimate
```
1,000 users/day × 10 requests/user = 10K requests/day
10K requests × 2 commands per request = 20K commands/day
20K commands × 30 days = 600K commands/month

Cost: $0.20 × (600K / 100K) = $1.20/month
```

Very affordable! 💰

## Troubleshooting

### Error: "fetch failed" or "ECONNREFUSED"
- **Cause**: Wrong URL or network issue
- **Fix**: Double-check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Error: "Unauthorized"
- **Cause**: Invalid token
- **Fix**: Regenerate token in Upstash dashboard

### Rate limiting not working
- **Cause**: Environment variables not loaded
- **Fix**:
  ```bash
  # Check if loaded
  echo $UPSTASH_REDIS_REST_URL

  # Restart dev server
  npm run dev
  ```

### Rate limits too strict/loose
- **Fix**: Adjust limits in `/lib/rate-limit.ts`
- Test with curl or Postman
- Check headers: `X-RateLimit-Remaining`

## Alternative: Local Redis (Development Only)

If you don't want to use Upstash for local dev:

```bash
# Install Redis locally
brew install redis  # macOS
# or
docker run -d -p 6379:6379 redis

# Update lib/rate-limit.ts to use local Redis
import { Redis } from '@upstash/redis';

const redis = process.env.NODE_ENV === 'production'
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : new Redis({
      url: 'redis://localhost:6379',
    });
```

**Note**: Local Redis doesn't work in edge runtimes (Vercel Edge). Use Upstash for production.

## Next Steps

After Upstash is configured:

1. ✅ Add rate limiting to all API routes
2. ✅ Customize limits per user plan (Free vs Pro)
3. ✅ Add rate limit headers to responses
4. ✅ Create user-facing rate limit warnings
5. ✅ Set up alerts for rate limit violations

---

**Rate Limiting Activated!** 🛡️

Your API is now protected from abuse and cost spikes.
