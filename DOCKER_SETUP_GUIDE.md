# Docker Local Development Setup

## Quick Start (5 Minutes)

### Step 1: Install Docker Desktop

**macOS:**
```bash
# Download and install Docker Desktop
open https://www.docker.com/products/docker-desktop

# Or using Homebrew
brew install --cask docker
```

**After installation:**
1. Open Docker Desktop from Applications
2. Wait for Docker to start (whale icon in menu bar)
3. Verify: `docker --version`

### Step 2: Start Local Databases

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers are running
docker ps

# Expected output:
# vibing2-postgres (port 5432)
# vibing2-redis (port 6379)
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.local.example .env.local

# Edit .env.local with your API key
# Required: ANTHROPIC_API_KEY
# Database URL is already configured for Docker
```

### Step 4: Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Verify database
npx prisma studio
```

### Step 5: Start Application

```bash
# Start dev server
npm run dev

# Open http://localhost:3000
```

---

## Docker Compose Configuration

### Services Included

**PostgreSQL 15:**
- Port: `5432`
- Database: `vibing2`
- User: `vibing2`
- Password: `vibing2_dev_pass`
- Volume: Persisted in `postgres_data`

**Redis 7:**
- Port: `6379`
- Max Memory: 256MB
- Eviction: allkeys-lru (for rate limiting)
- Volume: Persisted in `redis_data`

### Connection Strings

**PostgreSQL:**
```
postgresql://vibing2:vibing2_dev_pass@localhost:5432/vibing2
```

**Redis:**
```
redis://localhost:6379
```

---

## Docker Commands

### Start/Stop

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (DELETES ALL DATA!)
docker-compose down -v
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View PostgreSQL logs
docker-compose logs -f postgres

# View Redis logs
docker-compose logs -f redis
```

### Health Checks

```bash
# Check PostgreSQL
docker exec vibing2-postgres pg_isready -U vibing2

# Check Redis
docker exec vibing2-redis redis-cli ping
# Expected: PONG
```

### Database Access

```bash
# PostgreSQL shell
docker exec -it vibing2-postgres psql -U vibing2 -d vibing2

# PostgreSQL commands:
\dt              # List tables
\d+ User         # Describe User table
SELECT * FROM "User";
\q               # Quit

# Redis CLI
docker exec -it vibing2-redis redis-cli

# Redis commands:
PING             # Test connection
KEYS *           # List all keys
GET key_name     # Get value
FLUSHALL         # Clear all data (careful!)
exit             # Quit
```

---

## Troubleshooting

### Docker Not Running

**Error:** `Cannot connect to the Docker daemon`

**Fix:**
1. Open Docker Desktop
2. Wait for whale icon to appear in menu bar
3. Retry: `docker ps`

### Port Already in Use

**Error:** `port 5432 already allocated`

**Fix:**
```bash
# Find process using port
lsof -i :5432

# Kill process (if not needed)
kill -9 <PID>

# Or change port in docker-compose.yml:
ports:
  - "5433:5432"  # Use 5433 instead

# Update DATABASE_URL:
postgresql://vibing2:vibing2_dev_pass@localhost:5433/vibing2
```

### PostgreSQL Connection Failed

**Error:** `connection refused`

**Fix:**
```bash
# Check if container is running
docker ps | grep postgres

# If not running, start it
docker-compose up -d postgres

# Check logs
docker-compose logs postgres

# Verify health
docker exec vibing2-postgres pg_isready -U vibing2
```

### Redis Connection Failed

**Error:** `ECONNREFUSED localhost:6379`

**Fix:**
```bash
# Check if container is running
docker ps | grep redis

# Start Redis
docker-compose up -d redis

# Test connection
docker exec vibing2-redis redis-cli ping
```

### Database Migration Errors

**Error:** `relation "User" does not exist`

**Fix:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually:
docker-compose down -v
docker-compose up -d
npx prisma migrate dev --name init
```

### Permission Denied

**Error:** `permission denied while trying to connect`

**Fix:**
```bash
# Give Docker permission
sudo chmod 666 /var/run/docker.sock

# Or add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

---

## Data Management

### Backup Database

```bash
# Backup PostgreSQL
docker exec vibing2-postgres pg_dump -U vibing2 vibing2 > backup.sql

# Restore from backup
docker exec -i vibing2-postgres psql -U vibing2 -d vibing2 < backup.sql
```

### Export Redis Data

```bash
# Save Redis data
docker exec vibing2-redis redis-cli SAVE

# Copy dump file
docker cp vibing2-redis:/data/dump.rdb ./redis-backup.rdb

# Restore
docker cp ./redis-backup.rdb vibing2-redis:/data/dump.rdb
docker-compose restart redis
```

### Reset Everything

```bash
# Stop containers
docker-compose down

# Remove volumes (deletes all data)
docker volume rm vibing2_postgres_data vibing2_redis_data

# Restart
docker-compose up -d

# Re-run migrations
npx prisma migrate dev
```

---

## Production Notes

**⚠️ This setup is for LOCAL DEVELOPMENT only!**

For production:
- Use managed PostgreSQL (Supabase, Vercel Postgres, AWS RDS)
- Use managed Redis (Upstash, Redis Cloud, AWS ElastiCache)
- Never expose ports publicly
- Use strong passwords (not `vibing2_dev_pass`)
- Enable SSL/TLS
- Configure backups
- Set up monitoring

---

## Alternative: Local PostgreSQL (Without Docker)

If you prefer not using Docker:

```bash
# Install PostgreSQL locally
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb vibing2

# Update DATABASE_URL in .env.local:
DATABASE_URL="postgresql://localhost:5432/vibing2"
```

---

## Alternative: Local Redis (Without Docker)

```bash
# Install Redis locally
brew install redis

# Start Redis
brew services start redis

# Update .env.local:
REDIS_URL="redis://localhost:6379"
```

---

## Next Steps

After Docker setup is complete:

1. ✅ Containers running (`docker ps`)
2. ✅ Environment configured (`.env.local`)
3. ✅ Migrations run (`npx prisma migrate dev`)
4. ✅ Application starts (`npm run dev`)

Then proceed with:
- [ ] Write API tests
- [ ] Setup Sentry monitoring
- [ ] Deploy to production

---

**Setup Complete!** 🐳

Your local development environment with PostgreSQL and Redis is ready.
