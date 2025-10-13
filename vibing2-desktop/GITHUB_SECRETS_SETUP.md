# GitHub Secrets Setup Guide

Complete guide to configuring GitHub Secrets for automated CI/CD releases.

## Overview

GitHub Actions needs access to your Apple Developer credentials to sign and notarize builds automatically. This guide shows how to securely configure those credentials.

## Required Secrets

Navigate to: **Repository Settings > Secrets and variables > Actions > New repository secret**

You need to configure these 7 secrets:

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 certificate | Export from Keychain |
| `CERTIFICATE_PASSWORD` | Password for .p12 file | Set when exporting |
| `KEYCHAIN_PASSWORD` | Temporary keychain password for CI | Create a random password |
| `APPLE_DEVELOPER_IDENTITY` | Certificate identity string | From Keychain or `security` command |
| `APPLE_ID` | Your Apple ID email | Your developer account email |
| `APPLE_TEAM_ID` | 10-character team identifier | From Apple Developer portal |
| `APPLE_APP_PASSWORD` | App-specific password | Generate at appleid.apple.com |

## Step-by-Step Setup

### 1. Export Certificate from Keychain

#### A. Open Keychain Access

```bash
# Open Keychain Access app
open -a "Keychain Access"
```

#### B. Find Your Certificate

1. Click "My Certificates" in the left sidebar
2. Find "Developer ID Application: Your Name (TEAM_ID)"
3. Expand the certificate to see the private key

#### C. Export as .p12

1. Right-click on the certificate (not the key, the certificate row)
2. Select "Export 'Developer ID Application...'"
3. Save as: `certificate.p12`
4. Choose location: Downloads or Desktop
5. Set a password (remember this!)
6. Click "Save"
7. Enter your Mac password when prompted

### 2. Convert Certificate to Base64

```bash
# Navigate to where you saved the .p12
cd ~/Downloads

# Convert to base64 and copy to clipboard
base64 -i certificate.p12 | pbcopy

# Now paste into GitHub Secrets as APPLE_CERTIFICATE
```

**Important**: The base64 string will be very long (thousands of characters). That's normal!

### 3. Get Certificate Identity String

```bash
# List all code signing identities
security find-identity -v -p codesigning
```

Output will look like:

```
1) ABC123XYZ "Developer ID Application: John Doe (ABC123XYZ)"
```

Copy the entire string in quotes (including the quotes):

```
Developer ID Application: John Doe (ABC123XYZ)
```

This is your `APPLE_DEVELOPER_IDENTITY`.

### 4. Get Team ID

#### Option A: From the identity string above

Your Team ID is the part in parentheses: `ABC123XYZ`

#### Option B: From Apple Developer Portal

1. Go to https://developer.apple.com/account/#!/membership
2. Look for "Team ID"
3. It's a 10-character alphanumeric code

### 5. Generate App-Specific Password

You cannot use your regular Apple ID password for notarization. You must create an app-specific password.

#### Steps:

1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Click "Security" section
4. Find "App-Specific Passwords"
5. Click "Generate Password..."
6. Enter name: "Vibing2 CI/CD Notarization"
7. Click "Create"
8. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)
9. **Save it immediately** - you cannot view it again!

This is your `APPLE_APP_PASSWORD`.

### 6. Create Keychain Password

This is just a temporary password used during CI/CD builds. Create a random secure password:

```bash
# Generate a random password
openssl rand -base64 32
```

Or use any password manager to generate a strong password.

This is your `KEYCHAIN_PASSWORD`.

### 7. Set Certificate Password

This is the password you set when exporting the .p12 file in Step 1.

This is your `CERTIFICATE_PASSWORD`.

## Adding Secrets to GitHub

### Using GitHub Web Interface

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Click "Secrets and variables" in left sidebar
4. Click "Actions"
5. Click "New repository secret" button
6. Enter secret name and value
7. Click "Add secret"
8. Repeat for all 7 secrets

### Using GitHub CLI (Alternative)

If you have GitHub CLI installed:

```bash
# Set each secret (you'll be prompted to paste the value)
gh secret set APPLE_CERTIFICATE
gh secret set CERTIFICATE_PASSWORD
gh secret set KEYCHAIN_PASSWORD
gh secret set APPLE_DEVELOPER_IDENTITY
gh secret set APPLE_ID
gh secret set APPLE_TEAM_ID
gh secret set APPLE_APP_PASSWORD
```

## Complete Checklist

Copy this checklist and check off as you complete each secret:

```
[ ] APPLE_CERTIFICATE
    - Exported from Keychain as .p12
    - Converted to base64
    - Added to GitHub Secrets
    - Verified it's very long (thousands of characters)

[ ] CERTIFICATE_PASSWORD
    - Password used when exporting .p12
    - Added to GitHub Secrets

[ ] KEYCHAIN_PASSWORD
    - Generated random password
    - Added to GitHub Secrets

[ ] APPLE_DEVELOPER_IDENTITY
    - Found with: security find-identity -v -p codesigning
    - Format: "Developer ID Application: Name (TEAMID)"
    - Includes quotes in the secret value
    - Added to GitHub Secrets

[ ] APPLE_ID
    - Your Apple Developer account email
    - Added to GitHub Secrets

[ ] APPLE_TEAM_ID
    - 10-character team identifier
    - Found at developer.apple.com/account/#!/membership
    - Added to GitHub Secrets

[ ] APPLE_APP_PASSWORD
    - Generated at appleid.apple.com
    - Format: xxxx-xxxx-xxxx-xxxx
    - NOT your regular Apple ID password
    - Added to GitHub Secrets
    - Saved in password manager (can't view again)
```

## Verification

After adding all secrets, verify they're set correctly:

### 1. Check Secrets Are Present

1. Go to repository Settings > Secrets and variables > Actions
2. Verify all 7 secrets are listed
3. You can't view values, but they should all be there

### 2. Test with a Workflow Run

Trigger a test build:

```bash
# Create a test tag
git tag v0.0.1-test
git push origin v0.0.1-test
```

Watch the workflow in Actions tab. If it fails:

1. Check the error messages
2. Verify secret names match exactly (case-sensitive)
3. Re-check values in each secret

### 3. Common Issues

#### "Certificate import failed"

- `APPLE_CERTIFICATE` might be corrupted
- Re-export .p12 and convert to base64 again
- Make sure you copied the entire base64 string

#### "Invalid credentials" during notarization

- `APPLE_ID` might have typo
- `APPLE_APP_PASSWORD` might be wrong (did you use app-specific password?)
- `APPLE_TEAM_ID` might not match your account

#### "Certificate not found in keychain"

- `APPLE_DEVELOPER_IDENTITY` string might be wrong
- Make sure to include quotes in the secret value
- Verify the team ID in the string matches your account

#### "Permission denied"

- `CERTIFICATE_PASSWORD` might be wrong
- `KEYCHAIN_PASSWORD` might have special characters causing issues

## Security Best Practices

### Do's

✅ Use app-specific passwords (never your main Apple ID password)
✅ Generate strong random passwords for keychain
✅ Store backup of credentials in password manager
✅ Use GitHub Secrets (values are encrypted and hidden)
✅ Limit repository access to trusted collaborators
✅ Rotate credentials periodically (every 6-12 months)

### Don'ts

❌ Never commit certificates or passwords to git
❌ Never share secrets in issues or pull requests
❌ Never use your main Apple ID password
❌ Never store secrets in code or environment files
❌ Never log secret values in workflows
❌ Never use weak passwords

## Rotating Credentials

If credentials are compromised:

### 1. Revoke Certificate

1. Go to https://developer.apple.com/account/resources/certificates/list
2. Find the compromised certificate
3. Click "Revoke"

### 2. Create New Certificate

1. Follow the same process to create new Developer ID Application certificate
2. Export new .p12
3. Update GitHub Secrets with new values

### 3. Revoke App-Specific Password

1. Go to https://appleid.apple.com/account/manage
2. Find the compromised password in list
3. Click "Remove"
4. Generate new one
5. Update GitHub Secret

## Troubleshooting

### Can't Find Certificate in Keychain

```bash
# List all certificates
security find-certificate -a -p ~/Library/Keychains/login.keychain-db | grep "Developer ID"
```

If not found, download and install from Apple Developer portal.

### Certificate Expired

Certificates are valid for 5 years. If expired:

1. Go to Apple Developer portal
2. Create new certificate
3. Update GitHub Secrets

### Wrong Team ID

```bash
# Verify your Team ID
security find-identity -v -p codesigning | grep "Developer ID"

# Should show your team ID in parentheses
```

### App-Specific Password Not Working

- Make sure it's specifically for notarization
- Try generating a new one
- Verify you're using the correct Apple ID

## Additional Resources

- **Apple Developer Portal**: https://developer.apple.com/account/
- **App-Specific Passwords**: https://support.apple.com/en-us/HT204397
- **GitHub Secrets Docs**: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Notarization Guide**: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution

## Support

If you're stuck:

1. Double-check all secret names (case-sensitive)
2. Re-read this guide carefully
3. Check GitHub Actions logs for specific errors
4. Ask in Discord #development channel
5. Create GitHub issue with error details (never include secret values!)

---

**Important**: Keep this guide handy. You'll need it when rotating credentials or setting up new repositories.

**Last Updated**: 2025-10-13
