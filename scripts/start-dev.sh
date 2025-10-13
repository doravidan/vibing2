#!/bin/bash

# Vibing2 Development Startup Script
# This script checks prerequisites and starts the development environment

set -e

echo "🚀 Starting Vibing2 Development Environment"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo "📦 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo ""
    echo "Please install Docker Desktop:"
    echo "  macOS: brew install --cask docker"
    echo "  Or download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker is not running${NC}"
    echo "Starting Docker Desktop..."
    open -a Docker
    echo "Waiting for Docker to start..."

    # Wait for Docker to start (max 60 seconds)
    COUNTER=0
    until docker info &> /dev/null || [ $COUNTER -eq 60 ]; do
        sleep 1
        ((COUNTER++))
        echo -n "."
    done
    echo ""

    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker failed to start${NC}"
        echo "Please start Docker Desktop manually and run this script again"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if containers are running
echo ""
echo "🐳 Checking Docker containers..."

if ! docker ps | grep -q vibing2-postgres; then
    echo "Starting PostgreSQL..."
    docker-compose up -d postgres
    sleep 3
fi

if ! docker ps | grep -q vibing2-redis; then
    echo "Starting Redis..."
    docker-compose up -d redis
    sleep 2
fi

# Verify containers are healthy
echo "Checking PostgreSQL health..."
if docker exec vibing2-postgres pg_isready -U vibing2 &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not responding${NC}"
    echo "Check logs: docker-compose logs postgres"
    exit 1
fi

echo "Checking Redis health..."
if docker exec vibing2-redis redis-cli ping | grep -q PONG; then
    echo -e "${GREEN}✅ Redis is ready${NC}"
else
    echo -e "${RED}❌ Redis is not responding${NC}"
    echo "Check logs: docker-compose logs redis"
    exit 1
fi

# Check .env.local
echo ""
echo "🔧 Checking environment configuration..."

if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo "Creating from example..."
    cp .env.local.example .env.local
    echo -e "${GREEN}✅ Created .env.local${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.local and add your ANTHROPIC_API_KEY${NC}"
    echo ""
fi

# Check if ANTHROPIC_API_KEY is set
if grep -q "your_anthropic_api_key_here" .env.local 2>/dev/null; then
    echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY not configured in .env.local${NC}"
    echo "Please add your API key before continuing"
fi

# Check if Prisma is set up
echo ""
echo "🗄️  Checking database setup..."

if [ ! -d "node_modules/@prisma/client" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Check if migrations have been run
if ! docker exec vibing2-postgres psql -U vibing2 -d vibing2 -c "\dt" &> /dev/null | grep -q User; then
    echo "Running database migrations..."
    npx prisma migrate dev --name init
    echo -e "${GREEN}✅ Database migrations complete${NC}"
else
    echo -e "${GREEN}✅ Database is up to date${NC}"
fi

# Show connection info
echo ""
echo "📊 Database Information:"
echo "  PostgreSQL: postgresql://vibing2:vibing2_dev_pass@localhost:5432/vibing2"
echo "  Redis: redis://localhost:6379"
echo ""

# Start the application
echo "🎯 Starting Next.js development server..."
echo ""
echo "Opening Prisma Studio in background..."
npx prisma studio &> /dev/null &

echo ""
npm run dev
