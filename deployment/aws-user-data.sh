#!/bin/bash

# Vibing2 AWS EC2 User Data Script
# This script runs automatically when the EC2 instance launches

set -e

# Log everything
exec > >(tee -a /var/log/vibing2-setup.log)
exec 2>&1

echo "============================================"
echo "🚀 Vibing2 Automatic Setup Started"
echo "============================================"
echo "Time: $(date)"
echo ""

# Update system
echo "📦 Step 1: Updating system..."
yum update -y

# Install Node.js 20.x
echo "📦 Step 2: Installing Node.js 20.x..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install pnpm
echo "📦 Step 3: Installing pnpm..."
npm install -g pnpm
echo "✅ pnpm version: $(pnpm --version)"

# Install Git
echo "📦 Step 4: Installing Git..."
yum install -y git

# Install nginx
echo "📦 Step 5: Installing nginx..."
yum install -y nginx

# Clone repository
echo "📦 Step 6: Cloning repository..."
cd /home/ec2-user
git clone https://github.com/doravidan/vibing2.git
chown -R ec2-user:ec2-user /home/ec2-user/vibing2

# Install dependencies
echo "📦 Step 7: Installing dependencies..."
cd /home/ec2-user/vibing2
sudo -u ec2-user pnpm install --frozen-lockfile

# Create production environment file
echo "📦 Step 8: Creating environment file..."
cat > /home/ec2-user/vibing2/.env.production << 'EOF'
# Production Environment Variables
NEXTAUTH_URL=http://INSTANCE_IP:3000
NEXTAUTH_SECRET=CHANGE_THIS_SECRET
NEXT_PUBLIC_INSTANTDB_APP_ID=4a7c9af4-d678-423e-84ac-03e85390bc73
INSTANTDB_ADMIN_TOKEN=bf56d93d-559b-4988-a2d8-743a29a8ab0e
ANTHROPIC_API_KEY=CHANGE_THIS_KEY
NODE_ENV=production
EOF

chown ec2-user:ec2-user /home/ec2-user/vibing2/.env.production

# Build application
echo "📦 Step 9: Building application..."
cd /home/ec2-user/vibing2
sudo -u ec2-user pnpm run build

# Create systemd service
echo "📦 Step 10: Setting up systemd service..."
cat > /etc/systemd/system/vibing2.service << 'EOF'
[Unit]
Description=Vibing2 Next.js Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/vibing2
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /home/ec2-user/vibing2/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vibing2

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable vibing2
systemctl start vibing2

# Configure nginx
echo "📦 Step 11: Configuring nginx..."
cat > /etc/nginx/conf.d/vibing2.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Start nginx
systemctl enable nginx
systemctl start nginx

# Get instance IP
INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo ""
echo "============================================"
echo "✅ SETUP COMPLETE!"
echo "============================================"
echo ""
echo "🌐 Your app will be available at:"
echo "   http://$INSTANCE_IP:3000 (direct)"
echo "   http://$INSTANCE_IP (via nginx)"
echo ""
echo "⚠️  IMPORTANT: Update environment variables!"
echo ""
echo "SSH into the instance and run:"
echo "  sudo nano /home/ec2-user/vibing2/.env.production"
echo ""
echo "Update these values:"
echo "  NEXTAUTH_URL=http://$INSTANCE_IP:3000"
echo "  NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>"
echo "  ANTHROPIC_API_KEY=<your-api-key>"
echo ""
echo "Then restart:"
echo "  sudo systemctl restart vibing2"
echo ""
echo "📝 Useful commands:"
echo "  sudo systemctl status vibing2"
echo "  sudo journalctl -u vibing2 -f"
echo "  sudo systemctl restart vibing2"
echo ""
echo "Setup completed at: $(date)"
echo "============================================"