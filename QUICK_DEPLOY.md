# 🚀 Quick Deploy to AWS - TL;DR

## 1. Launch EC2 Instance

Go to: https://console.aws.amazon.com/ec2

**Click "Launch Instance" and configure:**
- Name: `vibing2-production`
- AMI: Amazon Linux 2023 (Free tier)
- Instance type: t2.micro (Free tier)
- Key pair: Create new → `vibing2-production-key` → Download .pem

**Security Group Rules:**
- Port 22 (SSH) - Your IP
- Port 80 (HTTP) - 0.0.0.0/0
- Port 3000 (Custom TCP) - 0.0.0.0/0

**User Data:**
Copy/paste contents of: `/Users/I347316/dev/vibing2/deployment/aws-user-data.sh`

**Launch!**

## 2. Get User Data Script

```bash
cat /Users/I347316/dev/vibing2/deployment/aws-user-data.sh
```

Copy the entire output and paste into "User data" field when launching instance.

## 3. Setup SSH Key

```bash
mv ~/Downloads/vibing2-production-key.pem ~/.ssh/
chmod 400 ~/.ssh/vibing2-production-key.pem
```

## 4. Wait 5-10 Minutes

The instance is automatically installing everything.

## 5. Configure Environment

```bash
# SSH in (replace YOUR_IP)
ssh -i ~/.ssh/vibing2-production-key.pem ec2-user@YOUR_IP

# Generate secret
openssl rand -base64 32

# Edit env file
sudo nano /home/ec2-user/vibing2/.env.production

# Update:
NEXTAUTH_URL=http://YOUR_IP:3000
NEXTAUTH_SECRET=<generated_secret>
ANTHROPIC_API_KEY=<your_key>

# Save (Ctrl+X, Y, Enter)

# Restart
sudo systemctl restart vibing2
```

## 6. Done! 🎉

Visit: **http://YOUR_IP:3000**

---

**Need details?** See [DEPLOY_NEW_AWS_INSTANCE.md](DEPLOY_NEW_AWS_INSTANCE.md)

**Common commands:**
```bash
sudo systemctl status vibing2       # Check status
sudo journalctl -u vibing2 -f       # View logs
sudo systemctl restart vibing2      # Restart app
```