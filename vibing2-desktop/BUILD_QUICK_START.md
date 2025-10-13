# Vibing2 DMG Build System - Quick Start Guide

## 5-Minute Setup

### Prerequisites Check

```bash
# Check if you have everything installed
node --version      # Should be v20+
pnpm --version      # Should be 9.7.0+
rustc --version     # Should be installed
cargo --version     # Should be installed
```

### Install Missing Tools

```bash
# If anything is missing:
brew install node pnpm
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install tauri-cli
```

---

## Build Your First DMG (Local - No Signing)

This creates an unsigned DMG for testing:

```bash
cd vibing2-desktop

# Build everything
pnpm run build:dmg

# Test it
open dist/Vibing2-macos.dmg
```

That's it! Your DMG is in `dist/`.

---

## Quick Commands

```bash
# Development
pnpm run dev                    # Start development server

# Building
pnpm run build:dmg             # Build DMG installer
pnpm run release:test          # Build and open dist folder

# Version Management
pnpm run version:patch         # Bump patch version (1.0.0 → 1.0.1)
pnpm run version:minor         # Bump minor version (1.0.0 → 1.1.0)
pnpm run version:major         # Bump major version (1.0.0 → 2.0.0)

# Release (requires Apple Developer account)
pnpm run sign                  # Sign and notarize
pnpm run release               # Build + Sign + Notarize
```

---

## Setup Code Signing (One-Time)

Only needed if you want to distribute outside your machine.

### 1. Join Apple Developer Program

- Go to https://developer.apple.com/programs/
- Pay $99/year
- Wait 1-2 days for approval

### 2. Create Certificate

- Go to https://developer.apple.com/account/resources/certificates/list
- Create "Developer ID Application" certificate
- Download and double-click to install

### 3. Get App-Specific Password

- Go to https://appleid.apple.com/account/manage
- Security > App-Specific Passwords
- Create one named "Vibing2 Notarization"
- Save the password (you can't see it again!)

### 4. Configure Environment

```bash
cd vibing2-desktop

# Copy template
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

Add these (replace with your actual values):

```bash
APPLE_DEVELOPER_IDENTITY="Developer ID Application: Your Name (ABC123)"
APPLE_ID="your.email@example.com"
APPLE_TEAM_ID="ABC123XYZ"
APPLE_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

Find your identity:
```bash
security find-identity -v -p codesigning
```

Find your Team ID:
- Go to https://developer.apple.com/account/#!/membership
- Copy the 10-character Team ID

### 5. Test Signing

```bash
# Build and sign
pnpm run build:dmg
pnpm run sign

# Wait 5-15 minutes for notarization
# When done, test:
open dist/Vibing2-macos.dmg
```

---

## Release Workflow

### Standard Release

```bash
# 1. Bump version
pnpm run version:patch

# 2. Edit changelog
nano ../CHANGELOG.md

# 3. Build and sign
pnpm run release

# 4. Push to GitHub
git push origin main
git push origin v1.0.1

# GitHub Actions will automatically create release!
```

### GitHub Release (Automated)

Once you push a version tag, GitHub Actions will:

1. Build for Intel and Apple Silicon
2. Create universal binary
3. Sign and notarize everything
4. Create GitHub release
5. Upload DMG files
6. Generate update manifest

Just push the tag and wait ~30 minutes.

---

## Common Issues

### "Permission denied" on scripts

```bash
chmod +x scripts/*.sh
```

### "Certificate not found"

Make sure you installed the certificate from Apple Developer:
1. Download .cer file
2. Double-click to add to Keychain

### "Notarization failed"

Check if using app-specific password (not your Apple ID password):
1. Go to appleid.apple.com
2. Security > App-Specific Passwords
3. Create new one

### Build takes too long

First build is slow (10-20 min). Subsequent builds are faster (2-3 min).

---

## File Structure

```
vibing2-desktop/
├── scripts/
│   ├── build-dmg.sh           # Main build script
│   ├── sign-and-notarize.sh   # Signing script
│   └── version-bump.sh         # Version management
│
├── dist/                       # Build output (gitignored)
│   ├── Vibing2.app
│   ├── Vibing2-macos.dmg
│   └── checksums...
│
├── .env.production             # Your signing credentials (gitignored)
└── DMG_BUILD_SYSTEM_README.md # Full documentation
```

---

## Next Steps

1. **Read full docs**: `DMG_BUILD_SYSTEM_README.md`
2. **Test locally**: Build and test DMG
3. **Setup signing**: Get Apple Developer account
4. **Configure CI/CD**: Add GitHub Secrets
5. **Create release**: Push version tag

---

## Support

- Full docs: `DMG_BUILD_SYSTEM_README.md`
- GitHub issues: https://github.com/vibing2/vibing2/issues
- Discord: https://discord.gg/vibing2

---

## Cheat Sheet

```bash
# Quick build (no signing)
pnpm run build:dmg

# Full release (with signing)
pnpm run release

# Version bump
pnpm run version:patch

# Open dist folder after build
pnpm run release:test
```

**That's it!** You're ready to build and distribute Vibing2.
