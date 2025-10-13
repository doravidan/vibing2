# Vibing2 Desktop Auto-Updater Deployment Guide

Complete guide for deploying and managing the Tauri auto-updater system for Vibing2 Desktop.

## Table of Contents

1. [Overview](#overview)
2. [Initial Setup](#initial-setup)
3. [Generating Signing Keys](#generating-signing-keys)
4. [Building and Signing](#building-and-signing)
5. [Deploying Updates](#deploying-updates)
6. [CI/CD Integration](#cicd-integration)
7. [Update Server Setup](#update-server-setup)
8. [Testing Updates](#testing-updates)
9. [Rollback Strategy](#rollback-strategy)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Vibing2 Desktop updater system provides:

- **Automatic update checking** (on launch + background every 6 hours)
- **Secure signature verification** using Tauri's built-in signing
- **Progress tracking** with download progress UI
- **One-click installation** with automatic app restart
- **Release notes display** in update notifications
- **Rollback capability** through version management
- **Multi-platform support** (macOS, Windows, Linux)

### Architecture

```
┌─────────────────┐
│  Vibing2 App    │
│  (Client)       │
└────────┬────────┘
         │ 1. Check for updates
         ▼
┌─────────────────┐
│ Update Server   │
│ /latest.json    │
└────────┬────────┘
         │ 2. Return manifest
         ▼
┌─────────────────┐
│  Vibing2 App    │
│  Download       │
└────────┬────────┘
         │ 3. Verify signature
         ▼
┌─────────────────┐
│  Vibing2 App    │
│  Install        │
└─────────────────┘
```

---

## Initial Setup

### 1. Install Dependencies

```bash
# Install Tauri CLI
cargo install tauri-cli

# Install Node.js dependencies
cd vibing2-desktop
pnpm install
```

### 2. Configure Update Endpoint

Edit `vibing2-desktop/src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.vibing2.com/{{target}}/{{arch}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

**Endpoint Variables:**
- `{{target}}`: Platform (darwin, windows, linux)
- `{{arch}}`: Architecture (x86_64, aarch64)
- `{{current_version}}`: Current app version

**Alternative: GitHub Releases**

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/vibing2/vibing2/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

---

## Generating Signing Keys

### Generate New Key Pair

```bash
cd vibing2-desktop

# Generate key pair
./scripts/sign-update.sh --generate

# Or using Tauri CLI directly
tauri signer generate -w ~/.tauri/vibing2.key
```

This creates:
- `~/.tauri/vibing2.key` - Private key (keep secure!)
- `~/.tauri/vibing2.key.pub` - Public key

### Configure Public Key

Copy the public key content:

```bash
cat ~/.tauri/vibing2.key.pub
```

Add to `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDQ4MzM4NzVGQzc0NzI1RTcKUldRNWVBcG9QQ2o0eXpNb2VYQ2RsV3BRenRYdWFMYUlCZTdWQktPdHZUMTZRRVNLZzFqVkpWNjQK"
    }
  }
}
```

### Secure Storage

Store the private key securely:

1. **Local Development**: `~/.tauri/vibing2.key`
2. **CI/CD**: GitHub Secrets or secure vault
3. **Backup**: Encrypted backup in secure location

**IMPORTANT:** Never commit private keys to version control!

---

## Building and Signing

### 1. Build the Application

```bash
cd vibing2-desktop

# Build for current platform
pnpm run tauri build

# Build for specific target
cargo tauri build --target x86_64-apple-darwin
cargo tauri build --target aarch64-apple-darwin
```

### 2. Sign Bundles

```bash
# Sign all bundles in release directory
./scripts/sign-update.sh --all src-tauri/target/release/bundle

# Sign specific bundle
./scripts/sign-update.sh src-tauri/target/release/bundle/dmg/Vibing2_1.0.0_aarch64.dmg
```

### 3. Generate Update Manifest

```bash
# Generate manifest for version 1.0.1
node scripts/generate-update-manifest.js 1.0.1 "Bug fixes and improvements"

# Generate manifest with GitHub URLs
node scripts/generate-update-manifest.js 1.0.1 "New features" --github
```

This generates:
- `releases/1.0.1.json` - Version-specific manifest
- `releases/latest.json` - Latest version manifest
- `releases/versions.json` - Version history

### 4. Verify Signatures

```bash
# Check that all bundles have signatures
ls -la src-tauri/target/release/bundle/**/*.sig
```

---

## Deploying Updates

### Option 1: GitHub Releases

**Step 1: Create Release**

```bash
# Tag the release
git tag desktop-v1.0.1
git push origin desktop-v1.0.1
```

**Step 2: Upload Assets**

The GitHub Actions workflow (`.github/workflows/desktop-release.yml`) automatically:
1. Builds for all platforms
2. Signs all bundles
3. Generates manifests
4. Uploads to GitHub releases

**Step 3: Verify Release**

Check that the release includes:
- `Vibing2_1.0.1_aarch64.dmg` + `.sig` (macOS ARM)
- `Vibing2_1.0.1_x86_64.dmg` + `.sig` (macOS Intel)
- `Vibing2_1.0.1_x64-setup.exe` + `.sig` (Windows)
- `Vibing2_1.0.1_amd64.AppImage` + `.sig` (Linux)
- `latest.json` (update manifest)

### Option 2: Custom Update Server

**Step 1: Upload Files**

```bash
# Upload to S3
aws s3 sync releases/ s3://releases.vibing2.com/

# Or using rsync
rsync -avz releases/ user@server:/var/www/releases/
```

**Step 2: Directory Structure**

```
releases.vibing2.com/
├── latest.json
├── versions.json
├── 1.0.0/
│   ├── Vibing2_1.0.0_aarch64.dmg
│   ├── Vibing2_1.0.0_aarch64.dmg.sig
│   └── ...
└── 1.0.1/
    ├── Vibing2_1.0.1_aarch64.dmg
    ├── Vibing2_1.0.1_aarch64.dmg.sig
    └── ...
```

**Step 3: Configure CORS (if needed)**

For S3:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

**Step 4: Configure Endpoint**

Update `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://releases.vibing2.com/latest.json"
      ]
    }
  }
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

The workflow (`.github/workflows/desktop-release.yml`) is triggered by:

1. **Tag Push**: `git push origin desktop-v1.0.1`
2. **Manual Dispatch**: Via GitHub Actions UI

### Required Secrets

Add these to GitHub repository secrets:

```bash
# Tauri signing
TAURI_SIGNING_PRIVATE_KEY         # Your private key content

# macOS code signing (optional)
APPLE_CERTIFICATE                 # Base64 encoded certificate
APPLE_CERTIFICATE_PASSWORD        # Certificate password
APPLE_SIGNING_IDENTITY           # Developer ID
APPLE_ID                         # Apple ID email
APPLE_PASSWORD                   # App-specific password
APPLE_TEAM_ID                    # Team ID

# Windows code signing (optional)
WINDOWS_CERTIFICATE              # Base64 encoded certificate
WINDOWS_CERTIFICATE_PASSWORD     # Certificate password
```

### Workflow Steps

1. **Create Release**: Creates GitHub release
2. **Build macOS**: Builds for x86_64 and aarch64
3. **Build Windows**: Builds NSIS and MSI installers
4. **Build Linux**: Builds AppImage and DEB packages
5. **Sign Bundles**: Signs all bundles with Tauri signer
6. **Generate Manifest**: Creates update manifest
7. **Upload Assets**: Uploads to GitHub release

### Manual Release

```bash
# Trigger manual release via GitHub CLI
gh workflow run desktop-release.yml \
  -f version=1.0.1 \
  -f release_notes="Bug fixes and improvements"
```

---

## Update Server Setup

### Static File Server

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name releases.vibing2.com;

    root /var/www/releases;

    location / {
        try_files $uri $uri/ =404;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
        add_header Cache-Control "public, max-age=3600";
    }

    location ~* \.(dmg|exe|AppImage|sig|json)$ {
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

### CDN Setup (CloudFlare)

1. Create CloudFlare account
2. Add domain: `releases.vibing2.com`
3. Configure S3 bucket as origin
4. Enable caching for static files

**Cache Rules:**
- `*.json`: 1 hour
- `*.dmg|*.exe|*.AppImage`: 24 hours
- `*.sig`: 24 hours

### Manifest Format

`latest.json`:

```json
{
  "version": "1.0.1",
  "date": "2025-10-13T12:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ...",
      "url": "https://releases.vibing2.com/1.0.1/Vibing2_1.0.1_x86_64.dmg",
      "format": "dmg",
      "hash": "sha256:abc123...",
      "size": 125829120
    },
    "darwin-aarch64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ...",
      "url": "https://releases.vibing2.com/1.0.1/Vibing2_1.0.1_aarch64.dmg",
      "format": "dmg",
      "hash": "sha256:def456...",
      "size": 118234112
    },
    "windows-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ...",
      "url": "https://releases.vibing2.com/1.0.1/Vibing2_1.0.1_x64-setup.exe",
      "format": "nsis",
      "hash": "sha256:ghi789...",
      "size": 98304000
    }
  },
  "notes": "### Changes\n- Fixed critical bug\n- Improved performance\n- Added new features"
}
```

---

## Testing Updates

### Local Testing

**Step 1: Build Test Release**

```bash
# Build version 1.0.0
cd vibing2-desktop
pnpm run tauri build

# Install and run the app
open src-tauri/target/release/bundle/macos/Vibing2.app
```

**Step 2: Create Update**

```bash
# Update version in tauri.conf.json to 1.0.1
# Build new version
pnpm run tauri build

# Sign and generate manifest
./scripts/sign-update.sh --all src-tauri/target/release/bundle
node scripts/generate-update-manifest.js 1.0.1 "Test update"
```

**Step 3: Serve Locally**

```bash
# Serve releases directory
cd releases
python3 -m http.server 8080

# Or use http-server
npx http-server -p 8080 --cors
```

**Step 4: Update Config**

Edit `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "http://localhost:8080/latest.json"
      ]
    }
  }
}
```

**Step 5: Test Update**

1. Launch app (v1.0.0)
2. Wait 5 seconds for update check
3. Update notification should appear
4. Click "Download Update"
5. Wait for download
6. Click "Install & Restart"
7. App restarts with v1.0.1

### Staging Environment

**Step 1: Deploy to Staging**

```bash
# Upload to staging server
rsync -avz releases/ user@staging.vibing2.com:/var/www/releases/
```

**Step 2: Configure Staging Endpoint**

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://staging-releases.vibing2.com/latest.json"
      ]
    }
  }
}
```

**Step 3: Test Beta Release**

1. Build staging version
2. Distribute to beta testers
3. Monitor update process
4. Collect feedback

### Production Testing

1. **Canary Release**: Deploy to 10% of users
2. **Monitor Metrics**: Track success rate, download times
3. **Gradual Rollout**: Increase to 50%, then 100%
4. **Rollback if Needed**: Revert to previous version

---

## Rollback Strategy

### Automatic Rollback

The updater doesn't support automatic rollback, but you can implement it:

**Step 1: Keep Previous Version**

```rust
// In updater.rs, add version backup logic
pub async fn backup_current_version() -> Result<(), Box<dyn std::error::Error>> {
    // Copy current binary to backup location
    let current_exe = std::env::current_exe()?;
    let backup_path = current_exe.with_extension("backup");
    std::fs::copy(&current_exe, &backup_path)?;
    Ok(())
}
```

**Step 2: Detect Failures**

```rust
// Check for startup failures
pub async fn check_startup_health() -> bool {
    // Implement health checks
    // If fails, restore from backup
    true
}
```

### Manual Rollback

**Option 1: Server-Side**

```bash
# Update latest.json to point to previous version
cp releases/1.0.0.json releases/latest.json

# Or modify manifest
jq '.version = "1.0.0"' releases/latest.json > temp.json
mv temp.json releases/latest.json
```

**Option 2: Client-Side**

Users can manually download and install previous version:

```bash
# Provide download links for all versions
https://releases.vibing2.com/1.0.0/Vibing2_1.0.0_aarch64.dmg
```

### Version Pinning

Allow users to pin to specific version:

```rust
#[tauri::command]
pub async fn set_version_pin(version: String) -> Result<(), String> {
    // Save pinned version to config
    // Skip update checks if on pinned version
    Ok(())
}
```

---

## Troubleshooting

### Update Check Fails

**Problem**: App doesn't detect updates

**Solutions**:

1. **Check Network Connection**
   ```bash
   curl https://releases.vibing2.com/latest.json
   ```

2. **Verify Endpoint Configuration**
   ```bash
   # Check tauri.conf.json
   cat src-tauri/tauri.conf.json | grep endpoints
   ```

3. **Check Logs**
   ```bash
   # macOS
   tail -f ~/Library/Logs/Vibing2/app.log

   # Windows
   type %APPDATA%\Vibing2\logs\app.log
   ```

### Signature Verification Fails

**Problem**: "Invalid signature" error

**Solutions**:

1. **Verify Public Key**
   ```bash
   # Compare public key in tauri.conf.json with actual key
   cat ~/.tauri/vibing2.key.pub
   ```

2. **Re-sign Bundle**
   ```bash
   ./scripts/sign-update.sh bundle.dmg
   ```

3. **Check Signature File**
   ```bash
   # Signature file should exist and not be empty
   cat bundle.dmg.sig
   ```

### Download Fails

**Problem**: Update download fails or hangs

**Solutions**:

1. **Check File Size**
   ```bash
   # Ensure file isn't corrupted
   ls -lh releases/1.0.1/Vibing2_1.0.1_aarch64.dmg
   ```

2. **Verify URL**
   ```bash
   # Test download manually
   curl -I https://releases.vibing2.com/1.0.1/Vibing2_1.0.1_aarch64.dmg
   ```

3. **Check CORS Headers**
   ```bash
   curl -H "Origin: tauri://localhost" \
     -I https://releases.vibing2.com/latest.json
   ```

### Installation Fails

**Problem**: Update downloads but won't install

**Solutions**:

1. **Check Permissions**
   ```bash
   # macOS: Allow app in System Preferences > Security
   xattr -d com.apple.quarantine Vibing2.app
   ```

2. **Verify Signature**
   ```bash
   codesign -dv Vibing2.app
   ```

3. **Check Disk Space**
   ```bash
   df -h
   ```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No update available" | Manifest not updated | Regenerate manifest |
| "Invalid manifest" | JSON syntax error | Validate JSON |
| "Download timeout" | Large file, slow connection | Increase timeout |
| "Installation failed" | Permissions issue | Run with elevated privileges |
| "Signature mismatch" | Wrong public key | Update public key in config |

---

## Best Practices

### Security

1. **Keep Private Key Secure**: Never commit or share
2. **Use HTTPS**: Always serve updates over HTTPS
3. **Verify Signatures**: Enable signature verification
4. **Monitor Updates**: Track update success rates
5. **Test Thoroughly**: Test on all platforms before release

### Performance

1. **Optimize Bundle Size**: Use compression
2. **Use CDN**: Distribute via CDN for faster downloads
3. **Cache Manifests**: Cache latest.json appropriately
4. **Delta Updates**: Consider implementing delta updates for large apps

### User Experience

1. **Show Progress**: Display download progress
2. **Release Notes**: Include meaningful release notes
3. **Non-Intrusive**: Don't interrupt user workflow
4. **Easy Rollback**: Allow users to downgrade if needed
5. **Notification Control**: Let users control update notifications

### Maintenance

1. **Version History**: Keep all version manifests
2. **Monitor Logs**: Track update errors
3. **Clean Old Versions**: Archive old releases
4. **Document Changes**: Maintain changelog
5. **Backup Keys**: Secure backup of signing keys

---

## Advanced Configuration

### Custom Update Flow

```rust
// Disable automatic updates
pub async fn init_updater(app: AppHandle) -> Result<Arc<UpdaterManager>, Box<dyn std::error::Error>> {
    let manager = Arc::new(UpdaterManager::new(app.clone()));

    // Custom config
    let config = UpdateConfig {
        check_on_launch: false,  // Disable auto-check
        launch_delay: 0,
        check_interval_hours: 0, // Disable background checks
        auto_download: false,
        auto_install: false,
        show_notifications: false,
    };

    manager.init(config).await;
    Ok(manager)
}
```

### Beta Channel Support

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://releases.vibing2.com/beta/latest.json"
      ]
    }
  }
}
```

### Update Scheduling

```rust
// Schedule updates for specific times
pub async fn schedule_update(hour: u32) {
    let now = chrono::Local::now();
    let target = now.date().and_hms(hour, 0, 0);
    let delay = (target - now).num_seconds();

    tokio::time::sleep(Duration::from_secs(delay as u64)).await;
    check_for_updates_internal(app).await?;
}
```

---

## Support

For issues or questions:

- GitHub Issues: https://github.com/vibing2/vibing2/issues
- Documentation: https://docs.vibing2.com
- Discord: https://discord.gg/vibing2

---

## License

MIT License - see LICENSE file for details
