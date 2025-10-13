# Manual AWS Update Guide

The AWS instance at `98.88.16.229` is not responding (connection timeout). This could mean:
- The instance is stopped
- The instance was terminated
- The security group changed
- Your IP address changed (and security group blocks it)

## Option 1: Check Instance Status (Recommended)

### Using AWS Console:
1. Go to AWS Console → EC2
2. Find instance `i-0e1d51bebdd77c2e1`
3. Check status:
   - **Stopped**: Click "Start instance"
   - **Terminated**: You'll need to launch a new instance
   - **Running**: Check security group settings

### Using AWS CLI:
```bash
aws ec2 describe-instances --instance-ids i-0e1d51bebdd77c2e1 --query 'Reservations[0].Instances[0].State.Name'
```

## Option 2: Start the Instance (if stopped)

### Using AWS Console:
1. Go to EC2 → Instances
2. Select instance `i-0e1d51bebdd77c2e1`
3. Click "Instance state" → "Start instance"
4. Wait 2-3 minutes for it to boot
5. Note the new Public IP (it changes when you stop/start)

### Using AWS CLI:
```bash
aws ec2 start-instances --instance-ids i-0e1d51bebdd77c2e1
```

## Option 3: Update Security Group

If the instance is running but you can't connect, your IP might have changed.

### Using AWS Console:
1. Go to EC2 → Security Groups
2. Find security group `sg-07e1618ae228a3d7c`
3. Edit Inbound Rules for SSH (port 22)
4. Update to your current IP or use `0.0.0.0/0` (less secure)

### Get your current IP:
```bash
curl -s https://api.ipify.org
```

## Option 4: Deploy to New Instance

If the instance was terminated or you want a fresh start:

### Step 1: Launch New EC2 Instance
```bash
# Use the AWS Console or CLI to launch a new t2.micro instance
# Save the new SSH key and note the public IP
```

### Step 2: Update deployment script
Edit `/Users/I347316/dev/vibing2/deployment/update-aws.sh`:
```bash
AWS_IP="YOUR_NEW_IP_HERE"
SSH_KEY="~/.ssh/YOUR_KEY_NAME.pem"
```

### Step 3: Run deployment
```bash
cd /Users/I347316/dev/vibing2
./deployment/deploy-to-aws.sh
```

## Manual Deployment Steps (if script fails)

If you prefer to deploy manually, follow these steps:

### 1. SSH into your instance
```bash
ssh -i ~/.ssh/vibing2-key.pem ec2-user@YOUR_INSTANCE_IP
```

### 2. Update the code
```bash
cd /home/ec2-user/vibing2

# Pull latest changes
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile

# Build application
pnpm run build
```

### 3. Update environment variables
```bash
nano /home/ec2-user/vibing2/.env.production
```

Add/update:
```env
NEXTAUTH_URL=http://YOUR_INSTANCE_IP:3000
NEXTAUTH_SECRET=your-secret-here
NEXT_PUBLIC_INSTANTDB_APP_ID=4a7c9af4-d678-423e-84ac-03e85390bc73
INSTANTDB_ADMIN_TOKEN=bf56d93d-559b-4988-a2d8-743a29a8ab0e
ANTHROPIC_API_KEY=your-api-key-here
NODE_ENV=production
```

### 4. Restart the service
```bash
sudo systemctl restart vibing2

# Check status
sudo systemctl status vibing2

# View logs
sudo journalctl -u vibing2 -f
```

## What's Been Updated

Your latest commit includes:
- ✅ Complete migration to InstantDB
- ✅ Fixed signup validation (6 char password, optional name)
- ✅ Fixed project save endpoint
- ✅ Fixed project load endpoint
- ✅ Fixed dashboard to show InstantDB projects
- ✅ Fixed activeAgents JSON parsing
- ✅ Added AWS deployment scripts

All changes have been pushed to: https://github.com/doravidan/vibing2.git

## Quick Command Reference

```bash
# Check instance status
aws ec2 describe-instances --instance-ids i-0e1d51bebdd77c2e1

# Start instance
aws ec2 start-instances --instance-ids i-0e1d51bebdd77c2e1

# Get your current IP
curl https://api.ipify.org

# SSH into instance (once running)
ssh -i ~/.ssh/vibing2-key.pem ec2-user@98.88.16.229

# Run deployment script (once connection works)
cd /Users/I347316/dev/vibing2
./deployment/update-aws.sh
```

## Need Help?

1. **Check AWS Console** - Easiest way to see instance status
2. **Verify IP hasn't changed** - Stop/start changes the public IP
3. **Check security group** - Make sure your IP is allowed
4. **View instance logs** - SSH in and check `sudo journalctl -u vibing2 -f`

---

Once you resolve the connection issue, simply run:
```bash
cd /Users/I347316/dev/vibing2
./deployment/update-aws.sh
```

This will automatically deploy all your latest changes!