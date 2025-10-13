# Vibing2 Desktop Auto-Updater - Quick Start Guide

Get your auto-updater up and running in 5 minutes.

## Quick Setup

### 1. Generate Signing Keys (One-time)

```bash
cd vibing2-desktop

# Generate key pair
./scripts/sign-update.sh --generate

# Output:
# ✓ Key pair generated successfully
# Private key saved to: ~/.tauri/vibing2.key
# Public key saved to: ~/.tauri/vibing2.key.pub
```

### 2. Configure Public Key

```bash
# Copy public key
cat ~/.tauri/vibing2.key.pub

# Add to src-tauri/tauri.conf.json
```

Edit `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/vibing2/vibing2/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "PASTE_YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 3. First Release

```bash
# Build the app
pnpm run tauri build

# Sign bundles
./scripts/sign-update.sh --all src-tauri/target/release/bundle

# Generate manifest
node scripts/generate-update-manifest.js 1.0.0 "Initial release" --github

# Create GitHub release
git tag desktop-v1.0.0
git push origin desktop-v1.0.0
```

### 4. Upload to GitHub Release

Upload these files to your GitHub release:

- All bundle files (`.dmg`, `.exe`, `.AppImage`)
- All signature files (`.sig`)
- `releases/latest.json` (as `latest.json`)

### 5. Test Update

```bash
# Build new version (increment version in tauri.conf.json)
pnpm run tauri build

# Sign and generate manifest
./scripts/sign-update.sh --all src-tauri/target/release/bundle
node scripts/generate-update-manifest.js 1.0.1 "Bug fixes" --github

# Create release
git tag desktop-v1.0.1
git push origin desktop-v1.0.1
```

**Testing:**
1. Install v1.0.0
2. Launch app
3. Wait 5 seconds
4. Update notification appears
5. Click "Download Update"
6. Click "Install & Restart"
7. App updates to v1.0.1

---

## Automated Releases with GitHub Actions

### 1. Add Repository Secrets

Go to: Settings > Secrets and variables > Actions

Add secret:
- `TAURI_SIGNING_PRIVATE_KEY`: Content of `~/.tauri/vibing2.key`

```bash
# Get private key content
cat ~/.tauri/vibing2.key
```

### 2. Push Tag to Trigger Release

```bash
# Create and push tag
git tag desktop-v1.0.1
git push origin desktop-v1.0.1
```

GitHub Actions will automatically:
1. Build for macOS, Windows, Linux
2. Sign all bundles
3. Generate update manifest
4. Create GitHub release
5. Upload all assets

### 3. Manual Release (Optional)

```bash
# Using GitHub CLI
gh workflow run desktop-release.yml \
  -f version=1.0.1 \
  -f release_notes="Bug fixes and improvements"
```

---

## Frontend Integration

### Add Update UI Component

Edit your main layout (e.g., `app/layout.tsx`):

```tsx
import { UpdateNotification } from '@/vibing2-desktop/components/UpdateNotification';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <UpdateNotification />
      </body>
    </html>
  );
}
```

### Add Settings Page

```tsx
import { UpdateSettings } from '@/vibing2-desktop/components/UpdateNotification';

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <UpdateSettings />
    </div>
  );
}
```

---

## Configuration Options

### Update Checking

| Option | Default | Description |
|--------|---------|-------------|
| `checkOnLaunch` | `true` | Check for updates on app launch |
| `launchDelay` | `5` seconds | Delay before initial check |
| `checkIntervalHours` | `6` hours | Background check interval |

### User Experience

| Option | Default | Description |
|--------|---------|-------------|
| `autoDownload` | `true` | Automatically download updates |
| `autoInstall` | `false` | Automatically install updates |
| `showNotifications` | `true` | Show update notifications |

### Endpoint Configuration

**GitHub Releases:**
```json
"endpoints": [
  "https://github.com/vibing2/vibing2/releases/latest/download/latest.json"
]
```

**Custom Server:**
```json
"endpoints": [
  "https://releases.vibing2.com/{{target}}/{{arch}}/{{current_version}}"
]
```

**Multiple Endpoints (fallback):**
```json
"endpoints": [
  "https://releases.vibing2.com/latest.json",
  "https://backup.vibing2.com/latest.json",
  "https://github.com/vibing2/vibing2/releases/latest/download/latest.json"
]
```

---

## Tauri Commands (Frontend API)

### Check for Updates

```typescript
import { invoke } from '@tauri-apps/api/core';

// Check for updates manually
await invoke('check_for_updates');

// Check if update is available
const available = await invoke<boolean>('is_update_available');
```

### Download Update

```typescript
// Download update without installing
await invoke('download_update');
```

### Install Update

```typescript
// Install and restart
await invoke('install_update');
```

### Get Version

```typescript
// Get current app version
const version = await invoke<string>('get_app_version');
```

### Configuration

```typescript
// Get update config
const config = await invoke('get_update_config');

// Set update config
await invoke('set_update_config', {
  config: {
    checkOnLaunch: true,
    launchDelay: 5,
    checkIntervalHours: 6,
    autoDownload: true,
    autoInstall: false,
    showNotifications: true,
  }
});
```

### Events

```typescript
import { listen } from '@tauri-apps/api/event';

// Listen for update available
await listen('update-available', (event) => {
  console.log('Update available:', event.payload);
});

// Listen for download progress
await listen('update-download-progress', (event) => {
  console.log('Download progress:', event.payload.percentage);
});

// Listen for download complete
await listen('update-downloaded', (event) => {
  console.log('Update downloaded:', event.payload.version);
});

// Listen for installation
await listen('update-installing', (event) => {
  console.log('Installing update:', event.payload.version);
});

// Listen for errors
await listen('update-error', (event) => {
  console.error('Update error:', event.payload.message);
});
```

---

## Troubleshooting

### Update Not Detected

**Check:**
1. Verify endpoint URL is correct
2. Ensure `latest.json` is accessible
3. Check network connectivity
4. Verify version numbers (new > current)

```bash
# Test endpoint manually
curl https://github.com/vibing2/vibing2/releases/latest/download/latest.json
```

### Signature Verification Failed

**Check:**
1. Public key matches private key
2. Bundle was signed correctly
3. Signature file exists

```bash
# Verify signature exists
ls -la bundle.dmg.sig

# Re-sign if needed
./scripts/sign-update.sh bundle.dmg
```

### Download Fails

**Check:**
1. File exists at URL
2. CORS headers configured (for custom server)
3. File isn't corrupted

```bash
# Test download
curl -I https://releases.vibing2.com/1.0.1/Vibing2_1.0.1_aarch64.dmg
```

---

## Common Workflows

### Development Workflow

```bash
# 1. Make changes
git commit -m "feat: new feature"

# 2. Update version in tauri.conf.json
vim src-tauri/tauri.conf.json  # version: "1.0.1"

# 3. Build
pnpm run tauri build

# 4. Test locally
open src-tauri/target/release/bundle/macos/Vibing2.app
```

### Release Workflow

```bash
# 1. Tag release
git tag desktop-v1.0.1
git push origin desktop-v1.0.1

# 2. Wait for GitHub Actions
# Monitor: https://github.com/vibing2/vibing2/actions

# 3. Verify release
# Check: https://github.com/vibing2/vibing2/releases

# 4. Test update
# Install previous version and test update
```

### Hotfix Workflow

```bash
# 1. Create hotfix branch
git checkout -b hotfix/1.0.2

# 2. Fix bug
git commit -m "fix: critical bug"

# 3. Update version
vim src-tauri/tauri.conf.json  # version: "1.0.2"

# 4. Merge and release
git checkout main
git merge hotfix/1.0.2
git tag desktop-v1.0.2
git push origin main desktop-v1.0.2
```

---

## Best Practices

### Version Numbering

Use semantic versioning:
- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features (backwards compatible)
- **Patch** (1.0.1): Bug fixes

### Release Notes

Be clear and concise:

```markdown
### New Features
- Added dark mode support
- Improved performance by 30%

### Bug Fixes
- Fixed crash on startup
- Resolved memory leak

### Breaking Changes
- Removed deprecated API endpoints
```

### Testing

Always test before release:
1. Build release version
2. Test on all platforms
3. Verify signatures
4. Test update flow
5. Check rollback capability

### Security

Protect your private key:
1. Never commit to version control
2. Use environment variables in CI/CD
3. Rotate keys periodically
4. Keep backup in secure location

---

## Resources

- [Full Deployment Guide](./UPDATER_DEPLOYMENT_GUIDE.md)
- [Tauri Updater Docs](https://tauri.app/v1/guides/distribution/updater)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)

---

## Support

Need help? Open an issue:
https://github.com/vibing2/vibing2/issues
