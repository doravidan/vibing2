#!/bin/bash

# Vibing2 AWS EC2 Deployment Script
# This script sets up the app on an AWS EC2 free tier instance

set -e  # Exit on error

echo "============================================"
echo "🚀 Vibing2 AWS EC2 Deployment"
echo "============================================"
echo ""

# Configuration
PROJECT_DIR="/home/ubuntu/vibing2"
SERVICE_NAME="vibing2"

echo "📋 Prerequisites Check..."
echo "- EC2 Instance: t2.micro (Free Tier)"
echo "- OS: Ubuntu 22.04 LTS"
echo "- Security Group: Port 3000 open"
echo ""

# Update system
echo "📦 Step 1: Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x
echo "📦 Step 2: Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install pnpm
echo "📦 Step 3: Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm
fi

echo "✅ pnpm version: $(pnpm --version)"

# Install Git
echo "📦 Step 4: Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
fi

# Clone or update repository
echo "📦 Step 5: Setting up project..."
if [ -d "$PROJECT_DIR" ]; then
    echo "Project directory exists, pulling latest changes..."
    cd $PROJECT_DIR
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/YOUR_USERNAME/vibing2.git $PROJECT_DIR
    cd $PROJECT_DIR
fi

# Install dependencies
echo "📦 Step 6: Installing dependencies..."
pnpm install --frozen-lockfile

# Copy environment file
echo "📦 Step 7: Setting up environment variables..."
if [ ! -f ".env.production" ]; then
    echo "⚠️  WARNING: .env.production not found!"
    echo "Please create .env.production file with the following:"
    echo ""
    cat .env.production.example
    echo ""
    read -p "Press Enter after creating .env.production..."
fi

# Build the application
echo "📦 Step 8: Building application..."
pnpm run build

# Setup systemd service
echo "📦 Step 9: Setting up systemd service..."
sudo cp deployment/vibing2.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 5

# Check service status
echo "📊 Service Status:"
sudo systemctl status $SERVICE_NAME --no-pager

echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "🌐 Your app should be running at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo ""
echo "📝 Useful commands:"
echo "   sudo systemctl status vibing2    # Check status"
echo "   sudo systemctl restart vibing2   # Restart app"
echo "   sudo systemctl stop vibing2      # Stop app"
echo "   sudo journalctl -u vibing2 -f    # View logs"
echo ""
echo "🔒 Security reminder:"
echo "   - Update Security Group to allow port 3000"
echo "   - Consider setting up nginx reverse proxy"
echo "   - Enable HTTPS with Let's Encrypt"
echo ""