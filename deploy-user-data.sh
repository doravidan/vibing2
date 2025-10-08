#!/bin/bash
# User data script to set up the EC2 instance

# Update system
dnf update -y

# Install Node.js and npm (Amazon Linux 2023 compatible)
dnf install -y nodejs npm

# Install git
dnf install -y git

# Install pnpm
npm install -g pnpm

# Create app directory
mkdir -p /home/ec2-user/vibing2
cd /home/ec2-user/vibing2

# Clone the repository
git clone https://github.com/doravidan/vibing2.git .

# Install dependencies
pnpm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=your-api-key-here
AUTH_SECRET=your-auth-secret-here
NEXTAUTH_URL=http://instance-ip:3000
NODE_ENV=production
EOF

# Set up Prisma
pnpm prisma generate
pnpm prisma migrate deploy

# Build the application
pnpm run build

# Create systemd service
cat > /etc/systemd/system/vibing2.service << 'SYSTEMD_EOF'
[Unit]
Description=Vibing2 Next.js Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/vibing2
Environment=NODE_ENV=production
ExecStart=/usr/bin/pnpm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

# Set correct permissions
chown -R ec2-user:ec2-user /home/ec2-user/vibing2

# Enable and start the service
systemctl enable vibing2
systemctl start vibing2

# Install and configure nginx as reverse proxy
dnf install -y nginx

cat > /etc/nginx/conf.d/vibing2.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

# Start nginx
systemctl enable nginx
systemctl start nginx
