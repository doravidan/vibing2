# Database Migration Guide: SQLite → PostgreSQL

## Step 1: Choose PostgreSQL Provider

### Option A: Local PostgreSQL (Development)
```bash
# Install PostgreSQL
brew install postgresql@15  # macOS
# or
sudo apt install postgresql-15  # Ubuntu

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb vibing2
```

### Option B: Supabase (Recommended for Production)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string from Settings → Database
4. Use "Connection Pooling" URL for better performance

### Option C: Vercel Postgres
```bash
# Install Vercel CLI
npm i -g vercel

# Create Postgres database
vercel postgres create vibing2-db

# Get connection string
vercel env pull
```

### Option D: Railway
1. Go to [railway.app](https://railway.app)
2. New Project → Add PostgreSQL
3. Copy `DATABASE_URL` from Variables tab

### Option E: AWS RDS (Enterprise)
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier vibing2-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username admin \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --publicly-accessible

# Wait for instance to be available
aws rds wait db-instance-available --db-instance-identifier vibing2-prod

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier vibing2-prod \
  --query 'DBInstances[0].Endpoint.Address'
```

## Step 2: Update Environment Variables

### Development (.env.local)
```bash
# Replace SQLite with PostgreSQL
# Old:
# DATABASE_URL="file:./dev.db"

# New (choose one):
# Local PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/vibing2"

# Supabase
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Vercel Postgres (auto-injected)
DATABASE_URL="postgres://default:xxxxx@xxxxx-pooler.us-east-1.postgres.vercel-storage.com/verceldb"

# Railway
DATABASE_URL="postgresql://postgres:xxxxx@containers-us-west-xx.railway.app:5432/railway"

# AWS RDS
DATABASE_URL="postgresql://admin:password@vibing2-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/vibing2"
```

### Production (Vercel/Railway/AWS)
```bash
# Vercel
vercel env add DATABASE_URL

# Railway - set in dashboard Variables tab

# AWS - add to .env or use AWS Secrets Manager
```

## Step 3: Export SQLite Data (Optional - if you have existing data)

### Using Prisma Studio
```bash
# Open Prisma Studio
npx prisma studio

# Manually export data as needed
# Or use migration script below
```

### Migration Script
Create `scripts/migrate-sqlite-to-postgres.ts`:

```typescript
import { PrismaClient as SQLiteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '@prisma/client';

const sqlite = new SQLiteClient({
  datasources: { db: { url: 'file:./dev.db' } }
});

const postgres = new PostgresClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function migrate() {
  console.log('🚀 Starting migration...');

  // Migrate Users
  const users = await sqlite.user.findMany();
  console.log(`📦 Migrating ${users.length} users...`);
  for (const user of users) {
    await postgres.user.create({ data: user });
  }

  // Migrate Projects
  const projects = await sqlite.project.findMany();
  console.log(`📦 Migrating ${projects.length} projects...`);
  for (const project of projects) {
    await postgres.project.create({ data: project });
  }

  // Migrate ProjectFiles
  const files = await sqlite.projectFile.findMany();
  console.log(`📦 Migrating ${files.length} files...`);
  for (const file of files) {
    await postgres.projectFile.create({ data: file });
  }

  // Migrate Messages
  const messages = await sqlite.message.findMany();
  console.log(`📦 Migrating ${messages.length} messages...`);
  for (const message of messages) {
    await postgres.message.create({ data: message });
  }

  console.log('✅ Migration complete!');
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  });
```

Run migration:
```bash
npx tsx scripts/migrate-sqlite-to-postgres.ts
```

## Step 4: Generate Prisma Client

```bash
# Generate new Prisma client for PostgreSQL
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# Or deploy migration (production)
npx prisma migrate deploy
```

## Step 5: Verify Migration

```bash
# Open Prisma Studio to verify
npx prisma studio

# Check database
psql $DATABASE_URL -c "\dt"  # List tables
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"User\";"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Project\";"
```

## Step 6: Update Application

### Remove SQLite Database File
```bash
# Backup first!
mv prisma/dev.db prisma/dev.db.backup

# Remove from git
echo "prisma/dev.db" >> .gitignore
git rm --cached prisma/dev.db
```

### Test Application
```bash
# Start dev server
npm run dev

# Test authentication
# Test project creation
# Test file operations
# Test collaboration
```

## Step 7: Deployment

### Vercel
```bash
# Deploy with Postgres
vercel --prod

# Migrations run automatically via `postinstall` script
```

### Railway
```bash
# Link Railway project
railway link

# Deploy
railway up

# Run migrations
railway run npx prisma migrate deploy
```

### AWS EC2
```bash
# SSH to instance
ssh -i key.pem ec2-user@your-instance

# Update .env
vi .env

# Update DATABASE_URL

# Run migrations
npx prisma migrate deploy

# Restart service
sudo systemctl restart vibing2
```

## Troubleshooting

### Connection Refused
```bash
# Check PostgreSQL is running
pg_isready

# Check firewall
sudo ufw status
sudo ufw allow 5432

# Check PostgreSQL config
sudo vi /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = '*'

sudo vi /etc/postgresql/15/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

sudo systemctl restart postgresql
```

### Migration Errors
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually drop and recreate
psql -U postgres -c "DROP DATABASE vibing2;"
psql -U postgres -c "CREATE DATABASE vibing2;"
npx prisma migrate deploy
```

### SSL Required (Production)
```bash
# Update DATABASE_URL with SSL
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Or use connection string from provider (usually includes SSL)
```

## Performance Tuning (Optional)

### Connection Pooling
```bash
# Update schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  # Add connection pooling
  relationMode = "prisma"
}

# Use PgBouncer or provider's pooling
# Supabase: Use "Connection Pooling" URL
# Vercel: Pooling included automatically
```

### Indexes (Already Configured)
```prisma
model Project {
  @@index([userId])
  @@index([visibility, updatedAt])
  @@index([projectType])
}

model Message {
  @@index([projectId, createdAt])
}

model TokenUsage {
  @@index([userId, timestamp])
  @@index([endpoint])
}
```

## Rollback Plan

If PostgreSQL migration fails:

```bash
# Restore SQLite
mv prisma/dev.db.backup prisma/dev.db

# Update schema
# Change provider back to "sqlite"

# Regenerate client
npx prisma generate

# Restart app
npm run dev
```

## Success Checklist

- [ ] PostgreSQL instance created
- [ ] DATABASE_URL updated in .env
- [ ] Data migrated (if applicable)
- [ ] `npx prisma migrate deploy` successful
- [ ] Prisma Studio shows tables
- [ ] Application starts without errors
- [ ] Authentication works
- [ ] Project CRUD works
- [ ] File operations work
- [ ] Performance acceptable (<100ms queries)
- [ ] Backups configured
- [ ] Monitoring configured

## Next Steps

After successful migration:

1. ✅ Configure automated backups
2. ✅ Set up monitoring (CloudWatch, Datadog)
3. ✅ Enable connection pooling
4. ✅ Add read replicas (if needed)
5. ✅ Document connection string for team

---

**Migration Complete!** 🎉

Your application is now running on PostgreSQL with improved:
- Concurrent user support
- Data durability
- Query performance
- Scalability
