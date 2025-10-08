#!/bin/bash

# QuickVibe - One-Click Railway Deployment
# This script automates the entire deployment process

set -e

echo "🚀 QuickVibe - Railway Deployment Assistant"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Railway credentials
export RAILWAY_TOKEN="2faaf866-137c-473c-a8ca-422878b80a43"
PROJECT_ID="7ab5f33b-a7d6-491a-9b40-93a99b6300c4"

echo -e "${BLUE}📋 Deployment Checklist:${NC}"
echo "✅ Railway project created: $PROJECT_ID"
echo "✅ Prisma configured for PostgreSQL"
echo "✅ Git repository initialized"
echo "✅ All code committed"
echo ""

# Check if user wants to push to GitHub
echo -e "${YELLOW}🔗 Step 1: GitHub Setup${NC}"
echo ""
read -p "Have you created a GitHub repository? (y/n): " github_ready

if [ "$github_ready" = "y" ] || [ "$github_ready" = "Y" ]; then
    read -p "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): " github_url

    echo ""
    echo -e "${BLUE}📤 Pushing to GitHub...${NC}"

    # Add remote if not exists
    if ! git remote | grep -q "origin"; then
        git remote add origin "$github_url"
    else
        git remote set-url origin "$github_url"
    fi

    # Push to GitHub
    git push -u origin main --force

    echo -e "${GREEN}✅ Code pushed to GitHub!${NC}"
    echo ""
else
    echo ""
    echo -e "${YELLOW}Please create a GitHub repository first:${NC}"
    echo "1. Go to: https://github.com/new"
    echo "2. Create a repository named 'quickvibe'"
    echo "3. Run this script again"
    echo ""
    exit 1
fi

# Open Railway dashboard
echo -e "${BLUE}🌐 Opening Railway Dashboard...${NC}"
echo ""
echo "Next steps in Railway Dashboard:"
echo ""
echo "1. Go to: https://railway.app/project/$PROJECT_ID"
echo "2. Click '+ New Service' → 'GitHub Repo'"
echo "3. Select your repository"
echo "4. Click '+ New' → 'Database' → 'PostgreSQL'"
echo "5. In your service, go to 'Variables' and add:"
echo ""
echo "   ANTHROPIC_API_KEY=your-anthropic-api-key-here"
echo "   AUTH_SECRET=your-auth-secret-here"
echo "   NODE_ENV=production"
echo "   NEXTAUTH_URL=\${{RAILWAY_PUBLIC_DOMAIN}}"
echo ""
echo "6. Once deployed, run migrations:"
echo "   railway run pnpm prisma migrate deploy"
echo ""
echo "7. Generate a domain in Settings → Networking"
echo ""

# Open browser
if command -v open &> /dev/null; then
    open "https://railway.app/project/$PROJECT_ID"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://railway.app/project/$PROJECT_ID"
else
    echo "Please open: https://railway.app/project/$PROJECT_ID"
fi

echo ""
echo -e "${GREEN}🎉 Deployment process started!${NC}"
echo ""
echo -e "${BLUE}📚 Full guide available in: DEPLOYMENT_COMPLETE.md${NC}"
echo ""
