# Vibing2 Desktop Auto-Updater - Quick Reference Card

One-page reference for common operations.

## Setup (One-time)

```bash
# 1. Generate keys
cd vibing2-desktop
./scripts/sign-update.sh --generate

# 2. Get public key
cat ~/.tauri/vibing2.key.pub

# 3. Add to src-tauri/tauri.conf.json:
#    "pubkey": "YOUR_PUBLIC_KEY_HERE"

# 4. Add to GitHub Secrets:
#    TAURI_SIGNING_PRIVATE_KEY = content of ~/.tauri/vibing2.key
```

## Build & Release

```bash
# Build
pnpm run tauri build

# Sign
./scripts/sign-update.sh --all src-tauri/target/release/bundle

# Generate manifest
node scripts/generate-update-manifest.js 1.0.0 "Release notes" --github

# Release
git tag desktop-v1.0.0
git push origin desktop-v1.0.0
```

## Frontend Integration

```tsx
// In your layout component
import { UpdateNotification } from '@/vibing2-desktop/components/UpdateNotification';

<UpdateNotification />
```

## Tauri Commands

```typescript
// Check for updates
await invoke('check_for_updates');

// Install update
await invoke('install_update');

// Download only
await invoke('download_update');

// Get version
const version = await invoke<string>('get_app_version');

// Check availability
const available = await invoke<boolean>('is_update_available');

// Get/set config
const config = await invoke('get_update_config');
await invoke('set_update_config', { config });
```

## Events

```typescript
import { listen } from '@tauri-apps/api/event';

// Listen for updates
await listen('update-available', handler);
await listen('update-download-progress', handler);
await listen('update-downloaded', handler);
await listen('update-installing', handler);
await listen('update-error', handler);
```

## Configuration

```json
{
  "checkOnLaunch": true,        // Check on app start
  "launchDelay": 5,              // Delay in seconds
  "checkIntervalHours": 6,       // Background check interval
  "autoDownload": true,          // Auto-download updates
  "autoInstall": false,          // Auto-install (requires confirmation)
  "showNotifications": true      // Show notifications
}
```

## Troubleshooting

```bash
# Test endpoint
curl https://releases.vibing2.com/latest.json

# Re-sign bundle
./scripts/sign-update.sh bundle.dmg

# Check logs (macOS)
tail -f ~/Library/Logs/Vibing2/app.log

# Serve locally for testing
cd releases && python3 -m http.server 8080
```

## File Locations

```
updater.rs                    Core implementation
UpdateNotification.tsx        UI components
generate-update-manifest.js   Manifest generator
sign-update.sh                Signing script
desktop-release.yml           CI/CD workflow
tauri.conf.json               Configuration
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Update not detected | Check endpoint URL, version number |
| Signature failed | Verify public key matches private key |
| Download failed | Check file exists, CORS headers |
| Install failed | Check permissions, disk space |

## Documentation

- **Setup:** [UPDATER_QUICK_START.md](./UPDATER_QUICK_START.md)
- **Deployment:** [UPDATER_DEPLOYMENT_GUIDE.md](./UPDATER_DEPLOYMENT_GUIDE.md)
- **Checklist:** [UPDATER_CHECKLIST.md](./UPDATER_CHECKLIST.md)
- **Summary:** [UPDATER_IMPLEMENTATION_SUMMARY.md](./UPDATER_IMPLEMENTATION_SUMMARY.md)

## Support

- GitHub: https://github.com/vibing2/vibing2/issues
- Discord: https://discord.gg/vibing2
