# Deploy to New AWS EC2 Instance - Step by Step

Complete guide to deploy Vibing2 to a fresh AWS EC2 free tier instance from scratch.

## Prerequisites

- ✅ AWS Account
- ✅ Code pushed to GitHub: https://github.com/doravidan/vibing2.git
- ✅ Anthropic API key ready

## Step 1: Launch EC2 Instance

### 1.1 Go to AWS EC2 Console
1. Open https://console.aws.amazon.com/ec2
2. Click **"Launch Instance"**

### 1.2 Configure Instance

**Name and tags:**
- Name: `vibing2-production`

**Application and OS Images (AMI):**
- **AMI**: Amazon Linux 2023 AMI
- **Architecture**: 64-bit (x86)
- ✅ Free tier eligible

**Instance type:**
- **Type**: t2.micro
- ✅ Free tier eligible (750 hours/month)

**Key pair (login):**
- Click **"Create new key pair"**
- Name: `vibing2-production-key`
- Type: RSA
- Format: .pem
- Click **"Create key pair"**
- **Save the .pem file** to `~/.ssh/vibing2-production-key.pem`

**Network settings:**
Click **"Edit"** and configure:
- Auto-assign public IP: **Enable**

**Firewall (security groups):**
- Create security group: **vibing2-security-group**
- Description: Allow SSH, HTTP, and port 3000

Add these rules:
1. **SSH**
   - Type: SSH
   - Port: 22
   - Source: My IP (or 0.0.0.0/0 if IP changes)

2. **HTTP**
   - Type: HTTP
   - Port: 80
   - Source: 0.0.0.0/0

3. **Custom TCP (Next.js)**
   - Type: Custom TCP
   - Port: 3000
   - Source: 0.0.0.0/0

**Configure storage:**
- Size: 8 GB (free tier eligible)
- Type: gp3

### 1.3 Add User Data Script

Scroll down to **"Advanced details"**
- Expand the section
- Scroll to **"User data"**
- Copy and paste the contents of `deployment/aws-user-data.sh`

To get the script:
```bash
cat /Users/I347316/dev/vibing2/deployment/aws-user-data.sh
```

### 1.4 Launch Instance
1. Review the summary on the right
2. Click **"Launch instance"**
3. Wait for the instance to start (2-3 minutes)
4. Note the **Public IPv4 address**

## Step 2: Set Up SSH Key

```bash
# Move the key to .ssh directory (if not already there)
mv ~/Downloads/vibing2-production-key.pem ~/.ssh/

# Set correct permissions
chmod 400 ~/.ssh/vibing2-production-key.pem
```

## Step 3: Wait for Automatic Setup

The user-data script is running automatically. This takes **5-10 minutes**.

### Monitor Setup Progress

```bash
# SSH into the instance (replace with your IP)
ssh -i ~/.ssh/vibing2-production-key.pem ec2-user@YOUR_INSTANCE_IP

# View setup log
sudo tail -f /var/log/vibing2-setup.log
```

You'll see output like:
```
✅ Node.js version: v20.x.x
✅ npm version: 10.x.x
✅ pnpm version: 9.x.x
...
✅ SETUP COMPLETE!
```

## Step 4: Configure Environment Variables

Once setup is complete:

```bash
# SSH into instance
ssh -i ~/.ssh/vibing2-production-key.pem ec2-user@YOUR_INSTANCE_IP

# Generate a secure NextAuth secret
openssl rand -base64 32
# Copy the output

# Edit environment file
sudo nano /home/ec2-user/vibing2/.env.production
```

Update these values:
```env
NEXTAUTH_URL=http://YOUR_INSTANCE_IP:3000
NEXTAUTH_SECRET=<paste the generated secret>
ANTHROPIC_API_KEY=<your anthropic api key>
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 5: Restart Application

```bash
# Restart the service with new environment variables
sudo systemctl restart vibing2

# Check status
sudo systemctl status vibing2

# Should show: Active: active (running)
```

## Step 6: Verify Deployment

### Check Service Logs
```bash
# View real-time logs
sudo journalctl -u vibing2 -f

# You should see:
# > Ready on http://localhost:3000
# > Socket.io ready on ws://localhost:3000/api/socket
```

### Test Access
Open your browser and go to:
- **Direct**: http://YOUR_INSTANCE_IP:3000
- **Via Nginx**: http://YOUR_INSTANCE_IP

You should see the Vibing2 homepage!

## Step 7: Create Your First User

1. Go to: http://YOUR_INSTANCE_IP:3000/auth/signup
2. Create an account:
   - Email: your email
   - Password: at least 6 characters
   - Name: optional
3. Sign in at: http://YOUR_INSTANCE_IP:3000/auth/signin
4. Start creating projects!

## Quick Command Reference

```bash
# SSH into instance
ssh -i ~/.ssh/vibing2-production-key.pem ec2-user@YOUR_INSTANCE_IP

# Service management
sudo systemctl status vibing2      # Check status
sudo systemctl restart vibing2     # Restart
sudo systemctl stop vibing2        # Stop
sudo systemctl start vibing2       # Start

# View logs
sudo journalctl -u vibing2 -f      # Real-time logs
sudo journalctl -u vibing2 -n 100  # Last 100 lines

# Update application (future updates)
cd /home/ec2-user/vibing2
git pull origin main
pnpm install
pnpm run build
sudo systemctl restart vibing2
```

## Troubleshooting

### Issue: User data script didn't run
```bash
# Check cloud-init logs
sudo cat /var/log/cloud-init-output.log
```

### Issue: Service won't start
```bash
# Check service logs
sudo journalctl -u vibing2 -n 50

# Check if port is in use
sudo lsof -i :3000
```

### Issue: Can't connect to instance
1. Check Security Group allows your IP on port 22
2. Verify instance is running (not stopped)
3. Check you're using correct key file

### Issue: Application shows errors
```bash
# Check environment variables
cat /home/ec2-user/vibing2/.env.production

# Verify all required variables are set
# Restart after changes
sudo systemctl restart vibing2
```

## Cost Information

### Free Tier (First 12 months)
- **EC2 t2.micro**: 750 hours/month FREE ✅
- **Storage**: 30 GB EBS FREE ✅
- **Data Transfer**: 1 GB outbound FREE ✅
- **Total**: $0/month for 12 months

### After Free Tier
- **EC2 t2.micro**: ~$8/month
- **Storage (8 GB)**: ~$1/month
- **Data Transfer**: ~$1/month (for light usage)
- **Total**: ~$10/month

## Optional Improvements

### 1. Setup Domain Name
- Purchase domain from Route53, Namecheap, etc.
- Point A record to your instance IP
- Update NEXTAUTH_URL in .env.production

### 2. Enable HTTPS with Let's Encrypt
```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 3. Setup Monitoring
- Enable CloudWatch logs
- Set up CPU/Memory alarms
- Configure SNS notifications

### 4. Automated Backups
- Create AMI snapshots
- Backup .env.production file
- Setup automated EBS snapshots

## What's Deployed

Your instance now has:
- ✅ Node.js 20.x
- ✅ pnpm package manager
- ✅ Vibing2 application (latest from GitHub)
- ✅ Nginx reverse proxy
- ✅ Systemd service (auto-restart)
- ✅ InstantDB authentication
- ✅ All latest features and fixes

## Summary

You now have a fully functional Vibing2 instance running on AWS! 🎉

**Your app is live at**: http://YOUR_INSTANCE_IP

The instance will:
- ✅ Auto-start on boot
- ✅ Auto-restart on crash
- ✅ Run 24/7 for free (first 12 months)
- ✅ Scale to handle multiple users

Enjoy your deployment! 🚀