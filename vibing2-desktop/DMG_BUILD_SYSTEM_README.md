# Vibing2 DMG Build System - Complete Documentation

## Overview

This is a professional production-grade DMG installer build system for Vibing2 macOS desktop application. It includes automated builds, code signing, notarization, GitHub Actions CI/CD, and distribution infrastructure.

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Requirements](#system-requirements)
3. [Setup](#setup)
4. [Build Scripts](#build-scripts)
5. [Code Signing & Notarization](#code-signing--notarization)
6. [GitHub Actions CI/CD](#github-actions-cicd)
7. [Distribution](#distribution)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Quick Start

### Local Development Build

```bash
# 1. Build DMG installer
cd vibing2-desktop
./scripts/build-dmg.sh

# 2. Test the installer
open dist/Vibing2-macos.dmg

# 3. Sign and notarize (requires Apple Developer account)
./scripts/sign-and-notarize.sh
```

### Version Bump and Release

```bash
# Bump version (patch, minor, major, or X.Y.Z)
./scripts/version-bump.sh patch

# Build and sign
./scripts/build-dmg.sh
./scripts/sign-and-notarize.sh

# Push to GitHub (triggers CI/CD)
git push origin main
git push origin v1.0.1
```

---

## System Requirements

### Development Machine

- **macOS**: 11.0 (Big Sur) or later
- **Xcode Command Line Tools**: `xcode-select --install`
- **Homebrew**: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- **Node.js**: v20+ (via `brew install node`)
- **pnpm**: v9.7.0+ (via `npm install -g pnpm`)
- **Rust**: Latest stable (via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Tauri CLI**: v2.0+ (via `cargo install tauri-cli`)

### Apple Developer Account

Required for code signing and notarization:

- **Apple Developer Program**: $99/year membership
- **Developer ID Application Certificate**: For code signing
- **App-Specific Password**: For notarization
- **Team ID**: From Apple Developer account

### Optional Tools

- **create-dmg**: For custom DMG backgrounds (`brew install create-dmg`)
- **ImageOptim**: For image optimization
- **GitHub CLI**: For release automation (`brew install gh`)

---

## Setup

### 1. Install Dependencies

```bash
# Install system dependencies
brew install node pnpm

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Install project dependencies
cd vibing2-desktop
pnpm install
```

### 2. Configure Environment

```bash
# Copy environment templates
cp .env.development.example .env.development
cp .env.production.example .env.production

# Edit .env.production with your credentials
nano .env.production
```

**Required values in `.env.production`:**

```bash
APPLE_DEVELOPER_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
APPLE_ID="your.email@example.com"
APPLE_TEAM_ID="ABCD123456"
APPLE_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

### 3. Get Apple Developer Credentials

#### A. Join Apple Developer Program

1. Go to https://developer.apple.com/programs/
2. Enroll ($99/year)
3. Wait for approval (1-2 business days)

#### B. Create Developer ID Certificate

1. Go to https://developer.apple.com/account/resources/certificates/list
2. Click "+" to create new certificate
3. Choose "Developer ID Application"
4. Follow instructions to generate CSR from Keychain Access
5. Download and install certificate

#### C. Find Your Certificate Identity

```bash
security find-identity -v -p codesigning
```

Copy the full identity string (e.g., "Developer ID Application: John Doe (ABC123XYZ)")

#### D. Get Your Team ID

1. Go to https://developer.apple.com/account/#!/membership
2. Copy your Team ID (10-character string)

#### E. Create App-Specific Password

1. Go to https://appleid.apple.com/account/manage
2. Click "Security" > "App-Specific Passwords"
3. Generate new password
4. Save it securely (you can't view it again)

### 4. Configure GitHub Secrets (for CI/CD)

Go to your GitHub repository > Settings > Secrets and variables > Actions

Add these secrets:

```
APPLE_CERTIFICATE              # Base64-encoded .p12 certificate
CERTIFICATE_PASSWORD           # Password for .p12 certificate
KEYCHAIN_PASSWORD              # Temporary password for CI keychain
APPLE_DEVELOPER_IDENTITY       # Certificate identity string
APPLE_ID                       # Your Apple ID email
APPLE_TEAM_ID                  # Your Team ID
APPLE_APP_PASSWORD             # App-specific password
TAURI_SIGNING_PRIVATE_KEY      # Optional: Tauri signing key
TAURI_SIGNING_PRIVATE_KEY_PASSWORD  # Optional: Key password
```

#### Export Certificate for CI/CD

```bash
# Export your certificate from Keychain
# Open Keychain Access > My Certificates
# Right-click your Developer ID Application certificate
# Export as .p12 file with password

# Convert to base64 for GitHub Secrets
base64 -i certificate.p12 | pbcopy

# Paste into APPLE_CERTIFICATE secret
```

---

## Build Scripts

### `build-dmg.sh`

Main build script that creates the DMG installer.

**Usage:**

```bash
./scripts/build-dmg.sh [--open]
```

**What it does:**

1. ✅ Validates build environment
2. 🧹 Cleans previous builds
3. 📦 Installs dependencies
4. 🏗️ Builds Next.js application
5. 📋 Copies assets to desktop folder
6. 🦀 Builds Tauri application
7. ✅ Verifies build outputs
8. 📊 Analyzes bundle size
9. 📝 Generates checksums
10. 📄 Creates build manifest
11. 📰 Generates release notes

**Output files:**

```
dist/
├── Vibing2.app                    # macOS application bundle
├── Vibing2-1.0.0.dmg             # Versioned DMG
├── Vibing2-macos.dmg             # Universal DMG filename
├── Vibing2-1.0.0.dmg.sha256      # Checksum
├── Vibing2-macos.dmg.sha256      # Checksum
├── build-manifest.json           # Build metadata
└── RELEASE_NOTES.md              # Generated release notes
```

**Options:**

- `--open`: Opens dist directory after build

**Example:**

```bash
# Standard build
./scripts/build-dmg.sh

# Build and open dist folder
./scripts/build-dmg.sh --open
```

---

### `sign-and-notarize.sh`

Signs the application and DMG, then submits to Apple for notarization.

**Prerequisites:**

- Completed setup steps above
- Valid `.env.production` file
- Built application (run `build-dmg.sh` first)

**Usage:**

```bash
./scripts/sign-and-notarize.sh
```

**What it does:**

1. ✅ Verifies Apple Developer certificate
2. ✏️ Signs application bundle (inside-out)
3. ✏️ Signs DMG file
4. ✅ Verifies signatures
5. 📦 Creates notarization archive
6. ☁️ Submits to Apple (waits for completion)
7. 📎 Staples notarization ticket
8. ✅ Verifies notarization
9. 📝 Generates signature file
10. 🧹 Cleans up temporary files

**Timeline:**

- Signing: ~30 seconds
- Notarization: 5-15 minutes (Apple processing)
- Total: ~15-20 minutes

**Troubleshooting:**

If notarization fails:

```bash
# Check recent submissions
xcrun notarytool history --apple-id your.email@example.com \
  --team-id TEAM_ID --password APP_PASSWORD

# Get details for specific submission
xcrun notarytool log SUBMISSION_ID --apple-id your.email@example.com \
  --team-id TEAM_ID --password APP_PASSWORD
```

---

### `version-bump.sh`

Automates version updates across all files and creates git tag.

**Usage:**

```bash
./scripts/version-bump.sh <type> [--yes]
```

**Types:**

- `patch`: 1.0.0 → 1.0.1 (bug fixes)
- `minor`: 1.0.0 → 1.1.0 (new features)
- `major`: 1.0.0 → 2.0.0 (breaking changes)
- `X.Y.Z`: Custom version (e.g., `1.5.0`)

**What it does:**

1. 📊 Reads current version
2. ➕ Calculates new version
3. 📝 Updates `tauri.conf.json`
4. 📝 Updates `package.json` (desktop)
5. 📝 Updates `package.json` (root)
6. 📝 Updates `Cargo.toml`
7. 🔄 Updates `Cargo.lock`
8. 📄 Generates changelog template
9. 💾 Commits changes to git
10. 🏷️ Creates git tag

**Examples:**

```bash
# Patch version bump
./scripts/version-bump.sh patch

# Minor version bump
./scripts/version-bump.sh minor

# Custom version
./scripts/version-bump.sh 2.0.0

# Skip confirmation prompt
./scripts/version-bump.sh patch --yes
```

**After running:**

1. Edit `CHANGELOG.md` with release notes
2. Push changes: `git push origin main`
3. Push tag: `git push origin v1.0.1`
4. Build release: `./scripts/build-dmg.sh`
5. Sign and notarize: `./scripts/sign-and-notarize.sh`

---

### `generate-update-manifest.sh`

Creates update manifest for Tauri auto-updater.

**Usage:**

```bash
./scripts/generate-update-manifest.sh
```

**Output:**

Creates `dist/latest.json` with:

```json
{
  "version": "1.0.0",
  "date": "2025-10-13T12:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "url": "https://github.com/vibing2/vibing2/releases/download/v1.0.0/...",
      "signature": ""
    },
    "darwin-aarch64": { ... }
  },
  "notes": "Release notes URL"
}
```

Upload this to your update server or GitHub releases.

---

## Code Signing & Notarization

### Why It's Required

- **Gatekeeper**: macOS requires apps to be signed and notarized
- **Security**: Users trust signed applications
- **Distribution**: App Store and enterprise distribution need signing
- **Updates**: Auto-updates require signed builds

### Signing Process

#### 1. Code Signing

Signs the application with your Developer ID:

```bash
codesign --sign "Developer ID Application: ..." \
  --options runtime \
  --entitlements entitlements.plist \
  --timestamp \
  Vibing2.app
```

#### 2. Notarization

Submits app to Apple for malware scanning:

```bash
xcrun notarytool submit Vibing2.zip \
  --apple-id your@email.com \
  --team-id TEAM_ID \
  --password APP_PASSWORD \
  --wait
```

#### 3. Stapling

Attaches notarization ticket to app:

```bash
xcrun stapler staple Vibing2.app
xcrun stapler staple Vibing2.dmg
```

### Entitlements

Defined in `src-tauri/entitlements.plist`:

- **Hardened Runtime**: Security feature
- **Network Access**: For AI API calls
- **File Access**: For project storage
- **Audio Input**: For voice features

### Verification

```bash
# Verify signature
codesign --verify --deep --strict --verbose=2 Vibing2.app

# Verify notarization
spctl --assess --verbose --type execute Vibing2.app

# Check entitlements
codesign -d --entitlements :- Vibing2.app
```

---

## GitHub Actions CI/CD

### Workflow: `release-desktop.yml`

Automated build, sign, and release pipeline.

**Triggers:**

- Push to version tag (e.g., `v1.0.0`)
- Manual workflow dispatch

**Jobs:**

#### 1. `create-release`

- Extracts version from tag
- Reads changelog
- Creates GitHub draft release

#### 2. `build-macos`

- Builds for x86_64 and aarch64
- Runs on macOS runners
- Matrix strategy for parallel builds
- Caches dependencies
- Signs and notarizes builds
- Uploads DMGs to release

#### 3. `create-universal-binary`

- Downloads both architecture builds
- Creates universal binary with `lipo`
- Packages as DMG
- Uploads to release

#### 4. `generate-update-manifest`

- Creates `latest.json` update manifest
- Includes checksums and URLs
- Uploads to release

#### 5. `publish-release`

- Marks release as published (not draft)
- Triggers website update webhook

### Usage

```bash
# Create and push tag
./scripts/version-bump.sh patch
git push origin main
git push origin v1.0.1

# GitHub Actions will automatically:
# 1. Build for Intel and Apple Silicon
# 2. Create universal binary
# 3. Sign and notarize
# 4. Create GitHub release
# 5. Upload all artifacts
# 6. Publish release
```

### Monitoring

View workflow progress:
- GitHub repository > Actions tab
- Real-time logs for each job
- Download artifacts after completion

### Manual Trigger

1. Go to repository > Actions
2. Select "Release Desktop App" workflow
3. Click "Run workflow"
4. Enter version (e.g., `1.0.0`)
5. Click "Run workflow"

---

## Distribution

### GitHub Releases

Primary distribution method.

**Automated:**

- CI/CD automatically creates releases
- Uploads DMG files for all architectures
- Includes checksums and manifest
- Release notes from CHANGELOG.md

**Manual:**

```bash
# Using GitHub CLI
gh release create v1.0.0 \
  dist/Vibing2-macos.dmg \
  dist/Vibing2-macos.dmg.sha256 \
  dist/latest.json \
  --title "Vibing2 v1.0.0" \
  --notes-file dist/RELEASE_NOTES.md
```

### Download Page

**Template:** `download-page-template.html`

**Features:**

- Detects user's Mac architecture
- Displays appropriate download
- Shows version from GitHub API
- Includes checksums for verification
- Responsive design
- System requirements
- Feature highlights

**Deployment:**

```bash
# Copy to website
cp download-page-template.html /path/to/website/download.html

# Update icon
cp icons/icon.png /path/to/website/icon.png

# Deploy
git add download.html icon.png
git commit -m "Update download page for v1.0.0"
git push
```

### Auto-Updates

**Configuration:** `tauri.conf.json`

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.vibing2.com/{{target}}/{{arch}}/{{current_version}}"
      ],
      "dialog": true
    }
  }
}
```

**Update Server:**

Host `latest.json` at the endpoint URL:

```
https://releases.vibing2.com/
├── darwin-x86_64/
│   └── 1.0.0/
│       └── latest.json
└── darwin-aarch64/
    └── 1.0.0/
        └── latest.json
```

**User Experience:**

1. App checks for updates on launch
2. Shows dialog if update available
3. Downloads and installs automatically
4. Restarts app with new version

---

## Troubleshooting

### Build Issues

#### Error: "Tauri CLI not found"

```bash
# Install Tauri CLI
cargo install tauri-cli
```

#### Error: "pnpm not found"

```bash
# Install pnpm globally
npm install -g pnpm
```

#### Error: "Next.js build failed"

```bash
# Clean and rebuild
rm -rf .next out
pnpm install --force
BUILD_MODE=desktop pnpm run build
```

#### Error: "Cargo build failed"

```bash
# Update Rust
rustup update

# Clean build cache
cd src-tauri
cargo clean
cargo build
```

### Code Signing Issues

#### Error: "Certificate not found"

```bash
# List available certificates
security find-identity -v -p codesigning

# If none found, install certificate from Apple Developer
# Download from: https://developer.apple.com/account/resources/certificates/list
```

#### Error: "codesign failed with exit code 1"

```bash
# Unlock keychain
security unlock-keychain ~/Library/Keychains/login.keychain-db

# Set keychain as default
security default-keychain -s ~/Library/Keychains/login.keychain-db

# Allow codesign to access keychain
security set-key-partition-list -S apple-tool:,apple: -s -k PASSWORD login.keychain-db
```

#### Error: "errSecInternalComponent"

macOS bug. Solution:

```bash
# Restart securityd
sudo killall -9 securityd

# Try signing again
./scripts/sign-and-notarize.sh
```

### Notarization Issues

#### Error: "Invalid credentials"

- Verify `APPLE_ID` is correct
- Verify `APPLE_APP_PASSWORD` is an app-specific password (not your account password)
- Verify `APPLE_TEAM_ID` matches your Developer account

#### Error: "Notarization failed"

Check logs:

```bash
xcrun notarytool history --apple-id EMAIL --team-id TEAM_ID --password PASSWORD

xcrun notarytool log SUBMISSION_ID --apple-id EMAIL --team-id TEAM_ID --password PASSWORD
```

Common issues:

- **Unsigned binaries**: Sign all frameworks and dylibs
- **Missing entitlements**: Check `entitlements.plist`
- **Hardened runtime**: Enable in `tauri.conf.json`

### GitHub Actions Issues

#### Error: "Secret not found"

Add missing secret in repository settings:
- Settings > Secrets and variables > Actions
- Click "New repository secret"

#### Error: "Build timeout"

Increase timeout in workflow:

```yaml
jobs:
  build-macos:
    timeout-minutes: 120  # Increase from default 60
```

#### Error: "Certificate import failed"

Verify certificate is valid base64:

```bash
# Re-export and encode
base64 -i certificate.p12 | pbcopy

# Update APPLE_CERTIFICATE secret
```

---

## Best Practices

### Security

1. **Never commit secrets**
   - Add `.env.production` to `.gitignore`
   - Use GitHub Secrets for CI/CD
   - Store credentials in password manager

2. **Use app-specific passwords**
   - Never use your main Apple ID password
   - Rotate passwords regularly

3. **Limit certificate access**
   - Only install on trusted machines
   - Use CI/CD for production builds
   - Revoke compromised certificates immediately

### Version Control

1. **Semantic versioning**
   - MAJOR: Breaking changes
   - MINOR: New features
   - PATCH: Bug fixes

2. **Changelog maintenance**
   - Update before release
   - Include all notable changes
   - Link to issues/PRs

3. **Git tags**
   - Always tag releases
   - Use annotated tags: `git tag -a v1.0.0`
   - Push tags: `git push --tags`

### Build Process

1. **Test before release**
   - Test DMG installation
   - Verify all features work
   - Check for console errors

2. **Clean builds**
   - Start with clean environment
   - Delete `node_modules` and `target`
   - Run full build pipeline

3. **Verify signatures**
   - Always verify after signing
   - Test on different macOS versions
   - Check Gatekeeper approval

### Distribution

1. **Release notes**
   - Write clear, concise notes
   - Highlight breaking changes
   - Include upgrade instructions

2. **Multiple channels**
   - Stable: Main releases
   - Beta: Testing releases
   - Nightly: Development builds

3. **Update strategy**
   - Auto-update for minor versions
   - Manual upgrade for major versions
   - Communicate breaking changes

---

## File Structure

```
vibing2-desktop/
├── scripts/
│   ├── build-dmg.sh              # Main build script
│   ├── sign-and-notarize.sh     # Signing and notarization
│   ├── version-bump.sh           # Version management
│   └── generate-update-manifest.sh
│
├── src-tauri/
│   ├── tauri.conf.json           # Tauri configuration
│   ├── entitlements.plist        # macOS entitlements
│   ├── Cargo.toml                # Rust dependencies
│   └── icons/
│       ├── icon.icns             # macOS app icon
│       └── icon.png              # PNG variants
│
├── .env.production.example       # Production env template
├── .env.development.example      # Development env template
├── LICENSE.txt                   # Software license
├── release-notes-template.md    # Release notes template
├── dmg-background-design.md     # DMG design spec
├── download-page-template.html  # Download page
└── DMG_BUILD_SYSTEM_README.md   # This file
```

---

## Resources

### Documentation

- **Tauri**: https://tauri.app/v2/
- **Apple Code Signing**: https://developer.apple.com/support/code-signing/
- **Notarization**: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution

### Tools

- **Tauri CLI**: https://github.com/tauri-apps/tauri
- **create-dmg**: https://github.com/create-dmg/create-dmg
- **GitHub CLI**: https://cli.github.com/

### Community

- **Discord**: https://discord.gg/vibing2
- **GitHub**: https://github.com/vibing2/vibing2
- **Documentation**: https://vibing2.com/docs

---

## Support

For issues or questions:

1. Check this documentation
2. Search GitHub issues
3. Ask in Discord #development channel
4. Create GitHub issue with details

---

**Last Updated:** 2025-10-13
**Version:** 1.0.0
