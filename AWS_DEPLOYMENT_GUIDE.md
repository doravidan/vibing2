# AWS EC2 Free Tier Deployment Guide

Complete guide to deploying Vibing2 on AWS EC2 free tier instance.

## Prerequisites

- AWS Account with free tier eligible
- SSH key pair for EC2 access
- Domain name (optional but recommended)
- Anthropic API key

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance
1. Go to AWS Console → EC2
2. Click "Launch Instance"
3. Configure:
   - **Name**: vibing2-app
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance type**: t2.micro (Free tier eligible)
   - **Key pair**: Create new or select existing
   - **Network**: Allow SSH (22) and Custom TCP (3000)

### 1.2 Security Group Configuration
Add these inbound rules:
- **SSH**: Port 22, Source: Your IP
- **HTTP**: Port 3000, Source: 0.0.0.0/0 (or specific IPs)
- **HTTPS**: Port 443, Source: 0.0.0.0/0 (optional, for later)

## Step 2: Connect to EC2 Instance

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Example:
ssh -i ~/Downloads/vibing2-key.pem ubuntu@18.206.123.45
```

## Step 3: Prepare Repository

### 3.1 Initialize Git Repository (if not done)
```bash
# On your local machine, in the vibing2 directory
cd /Users/I347316/dev/vibing2

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit for AWS deployment"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/vibing2.git
git branch -M main
git push -u origin main
```

## Step 4: Configure Production Environment

### 4.1 Generate NextAuth Secret
```bash
# On your local machine
openssl rand -base64 32
```

### 4.2 Create .env.production
On your EC2 instance, after cloning, create `/home/ubuntu/vibing2/.env.production`:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://YOUR_EC2_PUBLIC_IP:3000
NEXTAUTH_SECRET=YOUR_GENERATED_SECRET_HERE

# InstantDB Configuration
NEXT_PUBLIC_INSTANTDB_APP_ID=4a7c9af4-d678-423e-84ac-03e85390bc73
INSTANTDB_ADMIN_TOKEN=bf56d93d-559b-4988-a2d8-743a29a8ab0e

# Anthropic API Key
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE

# Node Environment
NODE_ENV=production
```

## Step 5: Run Deployment Script

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Download and run deployment script
cd ~
git clone https://github.com/YOUR_USERNAME/vibing2.git
cd vibing2
chmod +x deployment/deploy-to-aws.sh
./deployment/deploy-to-aws.sh
```

The script will:
1. Install Node.js 20.x
2. Install pnpm
3. Install dependencies
4. Build the application
5. Setup systemd service
6. Start the application

## Step 6: Verify Deployment

### 6.1 Check Service Status
```bash
sudo systemctl status vibing2
```

### 6.2 View Logs
```bash
# Follow logs in real-time
sudo journalctl -u vibing2 -f

# View last 50 lines
sudo journalctl -u vibing2 -n 50
```

### 6.3 Test Application
Open browser and navigate to:
```
http://YOUR_EC2_PUBLIC_IP:3000
```

## Step 7: Useful Commands

### Service Management
```bash
# Start service
sudo systemctl start vibing2

# Stop service
sudo systemctl stop vibing2

# Restart service
sudo systemctl restart vibing2

# Check status
sudo systemctl status vibing2

# Enable on boot
sudo systemctl enable vibing2

# Disable on boot
sudo systemctl disable vibing2
```

### Update Application
```bash
cd /home/ubuntu/vibing2
git pull origin main
pnpm install
pnpm run build
sudo systemctl restart vibing2
```

### View Logs
```bash
# Real-time logs
sudo journalctl -u vibing2 -f

# Last 100 lines
sudo journalctl -u vibing2 -n 100

# Logs from specific time
sudo journalctl -u vibing2 --since "1 hour ago"
```

## Step 8: Optional Improvements

### 8.1 Setup Nginx Reverse Proxy
```bash
sudo apt-get install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/vibing2

# Add configuration:
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/vibing2 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8.2 Setup SSL with Let's Encrypt
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 8.3 Setup Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Troubleshooting

### Issue: Service won't start
```bash
# Check logs
sudo journalctl -u vibing2 -n 50

# Check if port is in use
sudo lsof -i :3000

# Check Node.js version
node --version  # Should be 20.x
```

### Issue: Out of memory
```bash
# Check memory usage
free -h

# Add swap space (1GB)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Issue: Can't connect to application
1. Check Security Group allows port 3000
2. Check service is running: `sudo systemctl status vibing2`
3. Check firewall: `sudo ufw status`
4. Test locally: `curl http://localhost:3000`

## Cost Estimates

### Free Tier (First 12 months)
- **EC2 t2.micro**: 750 hours/month FREE
- **Storage**: 30 GB EBS FREE
- **Data Transfer**: 1 GB outbound FREE

### After Free Tier
- **EC2 t2.micro**: ~$8/month
- **Storage**: ~$3/month (30 GB)
- **Total**: ~$11/month

## Security Best Practices

1. ✅ Use strong SSH keys
2. ✅ Restrict SSH access to your IP only
3. ✅ Keep system updated: `sudo apt-get update && sudo apt-get upgrade`
4. ✅ Use environment variables for secrets
5. ✅ Enable AWS CloudWatch for monitoring
6. ✅ Setup automatic backups
7. ✅ Use HTTPS with SSL certificate
8. ✅ Configure firewall (ufw)

## Monitoring

### Setup CloudWatch
1. AWS Console → CloudWatch
2. Create alarm for:
   - CPU utilization > 80%
   - Memory utilization > 80%
   - Disk space < 20%

### Check System Resources
```bash
# CPU and memory
htop

# Disk space
df -h

# Network
netstat -tulpn | grep :3000
```

## Files Created

- `deployment/vibing2.service` - Systemd service file
- `deployment/deploy-to-aws.sh` - Deployment script
- `.env.production.example` - Environment variables template
- `AWS_DEPLOYMENT_GUIDE.md` - This guide

## Next Steps

1. ✅ Deploy to EC2
2. 🔄 Test all features
3. 🔄 Setup domain name (optional)
4. 🔄 Configure SSL certificate
5. 🔄 Setup monitoring and alerts
6. 🔄 Configure automated backups

---

**Your application will be live at**: `http://YOUR_EC2_PUBLIC_IP:3000`

Good luck with your deployment! 🚀