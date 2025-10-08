# Railway Deployment Guide for QuickVibe 2.0

## Prerequisites
- Railway account (https://railway.app)
- GitHub account
- Your Railway API token: `2faaf866-137c-473c-a8ca-422878b80a43`

## Method 1: Deploy via Railway Dashboard (Recommended)

### Step 1: Push to GitHub
```bash
# Create a new repository on GitHub (https://github.com/new)
# Then run these commands:

git remote add origin https://github.com/YOUR_USERNAME/quickvibe.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your QuickVibe repository
4. Railway will automatically detect it's a Next.js app

### Step 3: Configure Environment Variables
In Railway dashboard, go to Variables tab and add:

```env
# Required Environment Variables
ANTHROPIC_API_KEY=your-anthropic-api-key-here
AUTH_SECRET=your-auth-secret-here
DATABASE_URL=<Railway will provide PostgreSQL URL>
NEXTAUTH_URL=<Your Railway App URL>
NODE_ENV=production
```

### Step 4: Add PostgreSQL Database
1. In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically set the `DATABASE_URL` environment variable
3. Update your Prisma schema to use PostgreSQL instead of SQLite

### Step 5: Update Prisma for PostgreSQL
Edit `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Changed from sqlite
  url      = env("DATABASE_URL")
}
```

### Step 6: Deploy
Railway will automatically deploy when you push to GitHub!

## Method 2: Deploy via Railway CLI

### Step 1: Login to Railway
```bash
# Set your token
export RAILWAY_TOKEN=your-railway-token-here

# Or login interactively
railway login
```

### Step 2: Initialize Project
```bash
railway init
```

### Step 3: Link to Project
```bash
railway link
```

### Step 4: Add Environment Variables
```bash
railway variables set ANTHROPIC_API_KEY="your-anthropic-api-key-here"
railway variables set AUTH_SECRET="your-auth-secret-here"
railway variables set NODE_ENV="production"
```

### Step 5: Add PostgreSQL
```bash
railway add --database postgres
```

### Step 6: Update NEXTAUTH_URL
```bash
# Get your Railway app URL
railway domain

# Set the URL
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
```

### Step 7: Run Database Migrations
```bash
railway run pnpm prisma migrate deploy
```

### Step 8: Deploy
```bash
railway up
```

## Configuration Files Already Created

### ✅ railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### ✅ nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "pnpm"]

[phases.install]
cmds = ["pnpm install"]

[phases.build]
cmds = ["pnpm prisma generate", "pnpm run build"]

[start]
cmd = "pnpm run start"
```

## Post-Deployment Checklist

1. ✅ Verify environment variables are set
2. ✅ PostgreSQL database is connected
3. ✅ Run database migrations: `railway run pnpm prisma migrate deploy`
4. ✅ Update NEXTAUTH_URL with your Railway domain
5. ✅ Test authentication flow
6. ✅ Test project creation
7. ✅ Verify WebSocket connections work

## Troubleshooting

### Issue: Database Connection Failed
**Solution**: Make sure PostgreSQL is added and DATABASE_URL is set

### Issue: Build Failed
**Solution**: Check Railway logs with `railway logs`

### Issue: WebSockets Not Working
**Solution**: Railway supports WebSockets by default, but ensure your server.js is configured correctly

### Issue: Environment Variables Not Loading
**Solution**: Use Railway dashboard Variables tab, not .env files

## Database Migration

Since you're moving from SQLite to PostgreSQL:

1. Export your local data (if needed)
2. Update schema.prisma to use postgresql
3. Create migration:
   ```bash
   pnpm prisma migrate dev --name init_postgres
   ```
4. Push to Railway:
   ```bash
   railway run pnpm prisma migrate deploy
   ```

## Monitoring

- View logs: `railway logs`
- View metrics: Railway Dashboard → Metrics tab
- Set up alerts: Railway Dashboard → Settings → Notifications

## Quick Deploy Command

```bash
# One-line deploy
git add -A && git commit -m "Deploy to Railway" && git push origin main
```

Railway will automatically detect changes and redeploy!

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- QuickVibe Support: Check your Railway logs for issues

---

**Note**: The Railway API token provided may need to be refreshed. Get a new one from:
https://railway.app/account/tokens
