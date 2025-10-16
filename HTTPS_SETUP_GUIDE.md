# HTTPS Setup Guide for AWS EC2

## Why HTTPS is Needed

The **Web Speech API** (voice-to-text) is a browser security feature that **only works on HTTPS** connections (or localhost). This is a browser restriction that cannot be bypassed.

Your EC2 instance currently runs on `http://54.197.9.144:3000`, so the voice feature shows an error when clicked.

## Solution: Set Up HTTPS with SSL Certificate

Follow these steps to enable HTTPS on your EC2 instance:

---

## Prerequisites

1. **Domain Name** - You need a domain (e.g., `vibing2.com` or `app.vibing2.com`)
   - Purchase from: Namecheap, GoDaddy, Google Domains, etc.
   - Cost: ~$10-15/year

2. **Point Domain to EC2**
   - Go to your domain registrar's DNS settings
   - Add an **A Record**:
     - Name: `@` (or `app` for subdomain)
     - Value: `54.197.9.144` (your EC2 IP)
     - TTL: 300 seconds
   - Wait 5-30 minutes for DNS propagation

---

## Step 1: Install Nginx (Reverse Proxy)

SSH into your EC2 instance:

```bash
ssh -i ~/.ssh/vibing2-small-key.pem ec2-user@54.197.9.144
```

Install Nginx:

```bash
sudo yum update -y
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 2: Install Certbot (SSL Certificate Manager)

Certbot provides **free SSL certificates** from Let's Encrypt:

```bash
sudo yum install certbot python3-certbot-nginx -y
```

---

## Step 3: Configure Nginx for Your Domain

Create Nginx configuration:

```bash
sudo nano /etc/nginx/conf.d/vibing2.conf
```

Add this configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Test and restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 4: Get SSL Certificate

Run Certbot to get a **free SSL certificate**:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
1. Enter your email address
2. Agree to terms of service (Y)
3. Choose option 2: **Redirect HTTP to HTTPS** (recommended)

Certbot will:
- Automatically configure Nginx for HTTPS
- Set up auto-renewal of certificates
- Redirect all HTTP traffic to HTTPS

---

## Step 5: Configure EC2 Security Group

Go to AWS Console → EC2 → Security Groups:

**Add Inbound Rules**:
- Type: HTTPS
- Protocol: TCP
- Port: 443
- Source: 0.0.0.0/0 (Anywhere)

**Keep existing rules**:
- HTTP (80) - Will redirect to HTTPS
- Custom TCP (3000) - For direct access (optional)
- SSH (22) - For server access

---

## Step 6: Test HTTPS

1. Visit your domain: `https://yourdomain.com`
2. You should see a **🔒 padlock icon** in the browser
3. Your site is now secure!

---

## Step 7: Verify Voice Feature

1. Go to `https://yourdomain.com/create`
2. Click the **microphone icon** 🎤
3. Allow microphone permissions
4. Start speaking - it should now work!

---

## Auto-Renewal

Certbot automatically renews certificates before they expire (every 90 days).

Test auto-renewal:

```bash
sudo certbot renew --dry-run
```

---

## Alternative: Use Cloudflare (Easier Option)

If you want an **easier** solution without setting up Nginx:

1. **Sign up for Cloudflare** (free): https://cloudflare.com
2. **Add your domain** to Cloudflare
3. **Change nameservers** at your domain registrar to Cloudflare's nameservers
4. In Cloudflare DNS settings:
   - Add **A Record**: `@` → `54.197.9.144`
5. In Cloudflare SSL/TLS settings:
   - Set SSL mode to **Flexible**
6. Wait 5-10 minutes

Done! Your site will be available at `https://yourdomain.com` automatically.

**Pros**:
- No server configuration needed
- Free SSL certificate
- Built-in CDN and DDoS protection
- Faster setup

**Cons**:
- Requires using Cloudflare's nameservers
- "Flexible SSL" means traffic between Cloudflare and your server is still HTTP (but users see HTTPS)

---

## Troubleshooting

### Voice Still Not Working?

1. **Clear browser cache** and hard reload (Ctrl+Shift+R / Cmd+Shift+R)
2. **Check browser console** for errors (F12 → Console)
3. **Verify HTTPS** - Look for padlock icon in address bar
4. **Check microphone permissions** - Browser should ask for permission

### Certificate Errors?

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx config
sudo nginx -t
sudo systemctl status nginx
```

### Port 443 Not Accessible?

- Verify Security Group has HTTPS (443) inbound rule
- Check if Nginx is running: `sudo systemctl status nginx`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Domain Name | $10-15/year |
| SSL Certificate (Let's Encrypt) | **FREE** |
| EC2 Instance | Already running |
| Nginx | **FREE** |
| **Total Additional Cost** | **~$10-15/year** |

---

## Summary

**Without HTTPS**: Voice feature will show error on EC2
**With HTTPS**: Voice feature will work perfectly ✅

**Recommended Approach**:
1. Buy a domain name (~$10/year)
2. Use Cloudflare (easiest) OR set up Nginx + Certbot (more control)
3. Voice-to-text will work automatically once HTTPS is enabled

**Current Status**:
- ✅ Export features working (Download HTML, ZIP, Copy)
- ✅ View modes working (Preview, Code, Split)
- ⚠️ Voice feature available but shows error on HTTP
- 🔒 Voice feature will work once HTTPS is set up

---

## Need Help?

If you encounter issues during setup, check:
1. AWS EC2 Security Groups (ports 80, 443, 22)
2. Nginx configuration (`/etc/nginx/conf.d/`)
3. Nginx error logs (`/var/log/nginx/error.log`)
4. Certbot logs (`/var/log/letsencrypt/`)
5. DNS propagation (use https://dnschecker.org)
