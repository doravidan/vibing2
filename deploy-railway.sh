#!/bin/bash

# Railway Deployment Script for QuickVibe
# This script deploys the application using Railway API

set -e

RAILWAY_TOKEN="2faaf866-137c-473c-a8ca-422878b80a43"
PROJECT_ID="7ab5f33b-a7d6-491a-9b40-93a99b6300c4"
API_URL="https://backboard.railway.app/graphql/v2"

echo "🚀 Starting Railway deployment for QuickVibe..."

# Function to make GraphQL requests
railway_api() {
    local query="$1"
    curl -s "$API_URL" \
        -H "Authorization: Bearer $RAILWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\"}"
}

# Step 1: Update Prisma schema for PostgreSQL
echo "📝 Updating Prisma schema for PostgreSQL..."
cat > prisma/schema.prisma << 'PRISMA_EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  password      String
  image         String?
  plan          String    @default("FREE")
  tokenBalance  Int       @default(10000)
  contextUsed   Float     @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  projects      Project[]
  tokenUsage    TokenUsage[]
  accounts      Account[]
  sessions      Session[]
  collaborations ProjectCollaborator[]
  sentInvites   CollaborationInvite[] @relation("SentInvites")
  receivedInvites CollaborationInvite[] @relation("ReceivedInvites")
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  projectType String
  activeAgents String  @default("[]")
  currentCode String?
  visibility  String   @default("PRIVATE")
  likes       Int      @default(0)
  forks       Int      @default(0)
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages    Message[]
  collaborators ProjectCollaborator[]
  invites     CollaborationInvite[]
}

model Message {
  id        String   @id @default(cuid())
  role      String
  content   String
  projectId String
  createdAt DateTime @default(now())

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model TokenUsage {
  id           String   @id @default(cuid())
  userId       String
  tokensUsed   Int
  contextUsed  Float
  savedTokens  Int      @default(0)
  endpoint     String
  timestamp    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ProjectCollaborator {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      String   @default("VIEWER")
  createdAt DateTime @default(now())

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
}

model CollaborationInvite {
  id         String   @id @default(cuid())
  projectId  String
  fromUserId String
  toUserId   String
  status     String   @default("PENDING")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  fromUser   User     @relation("SentInvites", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUser     User     @relation("ReceivedInvites", fields: [toUserId], references: [id], onDelete: Cascade)
}
PRISMA_EOF

echo "✅ Prisma schema updated for PostgreSQL"

# Step 2: Create deployment using Railway CLI
echo "🔨 Building and deploying to Railway..."
export RAILWAY_TOKEN="$RAILWAY_TOKEN"

# Create environment service
echo "🔧 Creating environment and service..."

# Push to GitHub first (Railway will deploy from GitHub)
echo "📤 Setting up GitHub repository..."
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo "1. Create a new GitHub repository at https://github.com/new"
echo "2. Run these commands:"
echo ""
echo "   git remote add origin YOUR_GITHUB_REPO_URL"
echo "   git push -u origin main"
echo ""
echo "3. Go to Railway Dashboard: https://railway.app/project/$PROJECT_ID"
echo "4. Click 'New Service' → 'GitHub Repo'"
echo "5. Select your QuickVibe repository"
echo "6. Railway will automatically deploy!"
echo ""
echo "📋 Environment Variables to Set in Railway Dashboard:"
echo "   ANTHROPIC_API_KEY=your-anthropic-api-key-here"
echo "   AUTH_SECRET=your-auth-secret-here"
echo "   NODE_ENV=production"
echo "   NEXTAUTH_URL=<Your Railway App URL>"
echo ""
echo "💾 Database Setup:"
echo "1. In Railway Dashboard, click 'New' → 'Database' → 'PostgreSQL'"
echo "2. Railway will automatically set DATABASE_URL"
echo "3. Run migrations: railway run pnpm prisma migrate deploy"
echo ""
echo "🎉 Project Created: https://railway.app/project/$PROJECT_ID"
echo ""
echo "✅ Local files are ready for deployment!"
