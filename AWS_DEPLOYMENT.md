# AWS EC2 Deployment - Vibing2

## Instance Details

**Instance ID:** `i-0e1d51bebdd77c2e1`
**Public IP:** `98.88.16.229`
**Public DNS:** `ec2-98-88-16-229.compute-1.amazonaws.com`
**Instance Type:** `t2.micro` (Free Tier)
**Region:** `us-east-1`
**AMI:** Amazon Linux 2023

## Access Information

**SSH Access:**
```bash
ssh -i ~/.ssh/vibing2-key.pem ec2-user@98.88.16.229
```

**Application URLs:**
- Direct: http://98.88.16.229:3000
- Via Nginx: http://98.88.16.229

## Security Group Configuration

**Security Group ID:** `sg-07e1618ae228a3d7c`

Inbound Rules:
- Port 22 (SSH) - Open to 0.0.0.0/0
- Port 80 (HTTP) - Open to 0.0.0.0/0
- Port 3000 (Next.js) - Open to 0.0.0.0/0

## Deployment Status

The instance is currently being set up with the following:
1. ✅ Node.js 20 installation
2. ✅ Git and pnpm setup
3. ✅ Repository cloning
4. ✅ Dependencies installation
5. ✅ Database setup (SQLite)
6. ✅ Application build
7. ✅ Systemd service creation
8. ✅ Nginx reverse proxy configuration

**Note:** The user-data script is running in the background. It may take 5-10 minutes for the application to be fully deployed.

## Environment Variables

The instance needs the following environment variables to be configured:

```bash
# SSH into the instance
ssh -i ~/.ssh/vibing2-key.pem ec2-user@98.88.16.229

# Edit the .env file
cd /home/ec2-user/vibing2
nano .env
```

Update these values:
```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=your-actual-api-key
AUTH_SECRET=your-actual-auth-secret
NEXTAUTH_URL=http://98.88.16.229:3000
NODE_ENV=production
```

After updating environment variables:
```bash
# Restart the application
sudo systemctl restart vibing2

# Check status
sudo systemctl status vibing2
```

## Monitoring & Logs

**Check deployment progress:**
```bash
# View user-data execution log
sudo cat /var/log/cloud-init-output.log

# View application logs
sudo journalctl -u vibing2 -f

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

**Check application status:**
```bash
sudo systemctl status vibing2
sudo systemctl status nginx
```

## Database Management

**Run Prisma migrations:**
```bash
cd /home/ec2-user/vibing2
pnpm prisma migrate deploy
```

**Access database:**
```bash
cd /home/ec2-user/vibing2
pnpm prisma studio
```

## Useful Commands

**Restart application:**
```bash
sudo systemctl restart vibing2
```

**View application logs:**
```bash
sudo journalctl -u vibing2 -n 100 --no-pager
```

**Update application:**
```bash
cd /home/ec2-user/vibing2
git pull origin main
pnpm install
pnpm run build
sudo systemctl restart vibing2
```

## Cost Information

- **t2.micro instance:** Free Tier eligible (750 hours/month)
- **Storage (8GB gp3):** Free Tier eligible (30GB/month)
- **Data Transfer:** First 100GB/month free

## Instance Management

**Stop instance (to save costs when not in use):**
```bash
aws ec2 stop-instances --instance-ids i-0e1d51bebdd77c2e1
```

**Start instance:**
```bash
aws ec2 start-instances --instance-ids i-0e1d51bebdd77c2e1
```

**Terminate instance (delete completely):**
```bash
aws ec2 terminate-instances --instance-ids i-0e1d51bebdd77c2e1
```

## Troubleshooting

If the application is not accessible:

1. **Check if user-data script completed:**
   ```bash
   ssh -i ~/.ssh/vibing2-key.pem ec2-user@98.88.16.229
   sudo cat /var/log/cloud-init-output.log | tail -50
   ```

2. **Check if service is running:**
   ```bash
   sudo systemctl status vibing2
   ```

3. **Check nginx status:**
   ```bash
   sudo systemctl status nginx
   ```

4. **View error logs:**
   ```bash
   sudo journalctl -u vibing2 -n 50 --no-pager
   ```

5. **Test local connectivity:**
   ```bash
   curl http://localhost:3000
   ```

## Next Steps

1. Wait 5-10 minutes for the deployment script to complete
2. SSH into the instance and configure environment variables
3. Verify the application is running
4. Access the app at http://34.227.227.184
5. (Optional) Set up a custom domain and SSL certificate
