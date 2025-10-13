#!/bin/bash

# Vibing2 AWS Update Deployment Script
# Updates an existing AWS deployment with latest code

set -e

echo "============================================"
echo "🚀 Vibing2 AWS Update Deployment"
echo "============================================"
echo ""

# AWS Instance Details
AWS_IP="98.88.16.229"
AWS_USER="ec2-user"
SSH_KEY="~/.ssh/vibing2-key.pem"
PROJECT_DIR="/home/ec2-user/vibing2"

echo "📋 Target Instance:"
echo "   IP: $AWS_IP"
echo "   User: $AWS_USER"
echo "   Project: $PROJECT_DIR"
echo ""

# Test SSH connection
echo "🔐 Testing SSH connection..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$AWS_USER@$AWS_IP" "echo 'Connected successfully'" 2>/dev/null; then
    echo "❌ ERROR: Cannot connect to AWS instance"
    echo "   Please check:"
    echo "   - SSH key exists at $SSH_KEY"
    echo "   - Instance is running"
    echo "   - Security group allows SSH from your IP"
    exit 1
fi

echo "✅ SSH connection successful"
echo ""

# Update code on AWS
echo "📦 Step 1: Pulling latest code from repository..."
ssh -i "$SSH_KEY" "$AWS_USER@$AWS_IP" << 'ENDSSH'
    cd /home/ec2-user/vibing2
    echo "Current directory: $(pwd)"

    # Stash any local changes
    git stash

    # Pull latest changes
    git pull origin main

    if [ $? -ne 0 ]; then
        echo "❌ Git pull failed"
        exit 1
    fi

    echo "✅ Code updated"
ENDSSH

echo ""
echo "📦 Step 2: Installing dependencies..."
ssh -i "$SSH_KEY" "$AWS_USER@$AWS_IP" << 'ENDSSH'
    cd /home/ec2-user/vibing2

    # Install dependencies
    pnpm install --frozen-lockfile

    if [ $? -ne 0 ]; then
        echo "❌ Dependency installation failed"
        exit 1
    fi

    echo "✅ Dependencies installed"
ENDSSH

echo ""
echo "📦 Step 3: Building application..."
ssh -i "$SSH_KEY" "$AWS_USER@$AWS_IP" << 'ENDSSH'
    cd /home/ec2-user/vibing2

    # Build Next.js app
    pnpm run build

    if [ $? -ne 0 ]; then
        echo "❌ Build failed"
        exit 1
    fi

    echo "✅ Build successful"
ENDSSH

echo ""
echo "📦 Step 4: Restarting application..."
ssh -i "$SSH_KEY" "$AWS_USER@$AWS_IP" << 'ENDSSH'
    # Restart systemd service
    sudo systemctl restart vibing2

    if [ $? -ne 0 ]; then
        echo "❌ Service restart failed"
        exit 1
    fi

    echo "✅ Service restarted"

    # Wait for service to start
    sleep 3

    # Check service status
    echo ""
    echo "📊 Service Status:"
    sudo systemctl status vibing2 --no-pager | head -10
ENDSSH

echo ""
echo "============================================"
echo "✅ DEPLOYMENT UPDATE COMPLETE!"
echo "============================================"
echo ""
echo "🌐 Your app is running at:"
echo "   http://$AWS_IP:3000"
echo "   http://$AWS_IP (via nginx)"
echo ""
echo "📝 Useful commands:"
echo "   ssh -i $SSH_KEY $AWS_USER@$AWS_IP"
echo "   sudo systemctl status vibing2"
echo "   sudo journalctl -u vibing2 -f"
echo ""