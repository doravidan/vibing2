#!/bin/bash

# Automated AWS Deployment for Vibing2
# This script will create and configure everything automatically

set -e

echo "============================================"
echo "🚀 Vibing2 Automated AWS Deployment"
echo "============================================"
echo ""

# Configuration
INSTANCE_NAME="vibing2-production-$(date +%s)"
KEY_NAME="vibing2-key-$(date +%s)"
REGION="us-east-1"
AMI_ID="ami-0453ec754f44f9a4a"  # Amazon Linux 2023 in us-east-1
INSTANCE_TYPE="t2.micro"

echo "📋 Deployment Configuration:"
echo "   Instance Name: $INSTANCE_NAME"
echo "   Key Name: $KEY_NAME"
echo "   Region: $REGION"
echo "   Instance Type: $INSTANCE_TYPE"
echo ""

# Create key pair
echo "🔑 Step 1: Creating SSH key pair..."
aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --region "$REGION" \
    --query 'KeyMaterial' \
    --output text > ~/.ssh/${KEY_NAME}.pem

chmod 400 ~/.ssh/${KEY_NAME}.pem
echo "✅ Key saved to: ~/.ssh/${KEY_NAME}.pem"

# Create security group
echo "🔒 Step 2: Creating security group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name "${INSTANCE_NAME}-sg" \
    --description "Security group for Vibing2" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text)

echo "✅ Security Group ID: $SG_ID"

# Add security group rules
echo "🔒 Step 3: Configuring security group rules..."
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --region "$REGION" \
    --ip-permissions \
        IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges="[{CidrIp=0.0.0.0/0,Description='SSH'}]" \
        IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges="[{CidrIp=0.0.0.0/0,Description='HTTP'}]" \
        IpProtocol=tcp,FromPort=3000,ToPort=3000,IpRanges="[{CidrIp=0.0.0.0/0,Description='Next.js'}]"

echo "✅ Security rules configured"

# Launch instance with user data
echo "🚀 Step 4: Launching EC2 instance..."

# Base64 encode the user data script
USER_DATA=$(cat deployment/aws-user-data.sh | base64)

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --region "$REGION" \
    --user-data "$USER_DATA" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${INSTANCE_NAME}}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance ID: $INSTANCE_ID"
echo ""

# Wait for instance to be running
echo "⏳ Step 5: Waiting for instance to start..."
aws ec2 wait instance-running \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "✅ Instance is running!"
echo "   Public IP: $PUBLIC_IP"
echo ""

# Save deployment info
cat > deployment/deployment-info.txt << EOF
Deployment Information
=====================
Date: $(date)
Instance ID: $INSTANCE_ID
Instance Name: $INSTANCE_NAME
Public IP: $PUBLIC_IP
Region: $REGION
Key Name: $KEY_NAME
Key Path: ~/.ssh/${KEY_NAME}.pem
Security Group: $SG_ID

SSH Command:
ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@${PUBLIC_IP}

Application URLs:
http://${PUBLIC_IP}:3000 (direct)
http://${PUBLIC_IP} (via nginx)
EOF

echo "📝 Deployment info saved to: deployment/deployment-info.txt"
echo ""

# Wait for user data script to complete
echo "⏳ Step 6: Waiting for automatic setup to complete (this takes 5-10 minutes)..."
echo "   The instance is installing Node.js, dependencies, and building the app..."
echo ""

# Wait 2 minutes for instance to boot
sleep 120

# Try to SSH and check setup status
echo "🔍 Monitoring setup progress..."
for i in {1..20}; do
    echo "   Attempt $i/20: Checking if setup is complete..."

    if ssh -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ec2-user@${PUBLIC_IP} "test -f /var/log/vibing2-setup.log && grep -q 'SETUP COMPLETE' /var/log/vibing2-setup.log" 2>/dev/null; then
        echo "   ✅ Setup complete!"
        break
    fi

    if [ $i -eq 20 ]; then
        echo "   ⚠️  Setup is taking longer than expected. Continuing anyway..."
        echo "   You can check progress with: ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@${PUBLIC_IP} 'sudo tail -f /var/log/vibing2-setup.log'"
    else
        sleep 30
    fi
done

echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "📋 Deployment Summary:"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $PUBLIC_IP"
echo "   SSH Key: ~/.ssh/${KEY_NAME}.pem"
echo ""
echo "🌐 Your app is available at:"
echo "   http://${PUBLIC_IP}:3000"
echo "   http://${PUBLIC_IP}"
echo ""
echo "⚠️  NEXT STEPS (REQUIRED):"
echo ""
echo "1. Configure environment variables:"
echo "   ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@${PUBLIC_IP}"
echo "   sudo nano /home/ec2-user/vibing2/.env.production"
echo ""
echo "   Update these values:"
echo "   NEXTAUTH_URL=http://${PUBLIC_IP}:3000"
echo "   NEXTAUTH_SECRET=\$(openssl rand -base64 32)"
echo "   ANTHROPIC_API_KEY=your-api-key"
echo ""
echo "2. Restart the service:"
echo "   sudo systemctl restart vibing2"
echo ""
echo "📝 All deployment info saved to: deployment/deployment-info.txt"
echo ""
echo "🎉 Deployment successful!"
echo "============================================"