#!/bin/bash
# Minimal startup script for EC2

set -e

# Update and install basic packages
dnf update -y
dnf install -y nodejs npm git

# Install pnpm
npm install -g pnpm

# Create app directory
mkdir -p /home/ec2-user/app
chown -R ec2-user:ec2-user /home/ec2-user/app

# Clone repository as ec2-user
su - ec2-user -c "cd /home/ec2-user && git clone https://github.com/doravidan/vibing2.git app"

# Install dependencies
su - ec2-user -c "cd /home/ec2-user/app && pnpm install --ignore-scripts"

# Create .env
cat > /home/ec2-user/app/.env << 'EOF'
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=placeholder
AUTH_SECRET=placeholder-secret-key-min-32-chars
NEXTAUTH_URL=http://INSTANCE_IP:3000
NODE_ENV=development
EOF

chown ec2-user:ec2-user /home/ec2-user/app/.env

# Generate Prisma client
su - ec2-user -c "cd /home/ec2-user/app && npx prisma generate"

# Run migrations
su - ec2-user -c "cd /home/ec2-user/app && npx prisma migrate deploy"

# Create systemd service
cat > /etc/systemd/system/vibing2.service << 'SYSTEMD_EOF'
[Unit]
Description=Vibing2 Next.js App
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/app
Environment=NODE_ENV=development
ExecStart=/usr/bin/npx next dev -p 3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

# Enable and start service
systemctl daemon-reload
systemctl enable vibing2
systemctl start vibing2

echo "Deployment complete!"
