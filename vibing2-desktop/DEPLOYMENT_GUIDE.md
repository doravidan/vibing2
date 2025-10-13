# Deployment Guide

Complete guide for building, signing, and distributing Vibing2 Desktop for macOS.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Building for Production](#building-for-production)
- [Code Signing](#code-signing)
- [Creating DMG Installer](#creating-dmg-installer)
- [Notarization](#notarization)
- [Distribution](#distribution)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

1. **macOS Development Environment**
   - macOS 11 (Big Sur) or later
   - Xcode 13+ with Command Line Tools
   - Valid Apple Developer Account (for distribution)

2. **Development Tools**
   ```bash
   # Install Homebrew (if not already installed)
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   # Install Node.js and pnpm
   brew install node@18
   brew install pnpm

   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env

   # Verify installations
   node --version    # Should be 18.x or higher
   pnpm --version    # Should be 9.x or higher
   rustc --version   # Should be 1.70 or higher
   ```

3. **Apple Developer Certificates**
   - Developer ID Application certificate
   - Developer ID Installer certificate
   - Valid provisioning profiles

---

## Development Setup

### Step 1: Clone and Install Dependencies

```bash
# Navigate to project directory
cd /path/to/vibing2

# Navigate to desktop app
cd vibing2-desktop

# Install Node.js dependencies
pnpm install

# Verify Tauri CLI is installed
pnpm tauri --version
```

### Step 2: Configure Environment

```bash
# Create .env file in vibing2-desktop directory
cat > .env << 'EOF'
# Development settings
TAURI_DEV_HOST=localhost
TAURI_DEV_PORT=3000

# API Configuration (optional for development)
ANTHROPIC_API_KEY=your_api_key_here
EOF
```

### Step 3: Build Next.js Frontend

```bash
# Build the Next.js app from parent directory
cd /path/to/vibing2
pnpm run build

# Verify build output exists
ls -la out/
```

### Step 4: Run Development Mode

```bash
# Start development server
cd vibing2-desktop
pnpm run dev

# This will:
# 1. Start the Tauri development environment
# 2. Launch the app with hot-reload enabled
# 3. Open the app window
```

**Development Mode Features:**
- Hot reload for Rust and frontend changes
- DevTools available (right-click -> Inspect)
- Console logging enabled
- SQLite database in development location

---

## Building for Production

### Step 1: Prepare Build Environment

```bash
# Clean previous builds
cd vibing2-desktop
rm -rf src-tauri/target/release
rm -rf src-tauri/target/bundle

# Update dependencies
pnpm install
cd src-tauri && cargo update && cd ..
```

### Step 2: Build Next.js Static Export

```bash
# Build from parent directory
cd /path/to/vibing2
pnpm run build

# Verify static export
cd out
ls -la
# Should see index.html, _next/, etc.
```

### Step 3: Build Tauri Application

```bash
# Return to desktop app directory
cd vibing2-desktop

# Build for production
pnpm run build

# This runs:
# 1. beforeBuildCommand: pnpm run build:next
# 2. Copies assets to public/
# 3. Compiles Rust code in release mode
# 4. Bundles app with optimizations
# 5. Creates .app and .dmg files
```

### Build Output Locations

```
src-tauri/target/release/
├── vibing2-desktop                    # Executable binary
└── bundle/
    ├── macos/
    │   ├── Vibing2.app                # macOS application bundle
    │   └── Vibing2.app.tar.gz         # Compressed app
    └── dmg/
        └── Vibing2_1.0.0_aarch64.dmg  # DMG installer (Apple Silicon)
        └── Vibing2_1.0.0_x64.dmg      # DMG installer (Intel)
```

### Build Verification

```bash
# Check app structure
cd src-tauri/target/release/bundle/macos
ls -la Vibing2.app/Contents/

# Expected structure:
# Contents/
# ├── Info.plist
# ├── MacOS/
# │   └── vibing2-desktop
# ├── Resources/
# │   └── icon.icns
# └── _CodeSignature/

# Test the app
open Vibing2.app
```

---

## Code Signing

Code signing is required for distribution outside the App Store and for Gatekeeper approval.

### Step 1: Obtain Developer Certificates

1. **Log in to Apple Developer Portal**
   - Visit: https://developer.apple.com/account
   - Navigate to: Certificates, Identifiers & Profiles

2. **Create Developer ID Application Certificate**
   - Click "+" to create new certificate
   - Select "Developer ID Application"
   - Follow CSR (Certificate Signing Request) instructions
   - Download and install certificate

3. **Verify Certificate Installation**
   ```bash
   # List all signing identities
   security find-identity -v -p codesigning

   # Look for entry like:
   # "Developer ID Application: Your Name (TEAM_ID)"
   ```

### Step 2: Configure Signing in Tauri

Edit `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "macOS": {
      "minimumSystemVersion": "11.0",
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "provisioningProfile": null,
      "entitlements": null,
      "exceptionDomain": ""
    }
  }
}
```

### Step 3: Sign the Application

#### Automatic Signing (Recommended)

```bash
# Build with automatic signing
pnpm run build

# Tauri will automatically sign if identity is configured
```

#### Manual Signing

```bash
# Build without signing first
pnpm run build

# Sign manually
cd src-tauri/target/release/bundle/macos
codesign --force --deep --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --options runtime \
  --entitlements ../../../entitlements.plist \
  Vibing2.app

# Verify signature
codesign -dv --verbose=4 Vibing2.app
spctl -a -vv Vibing2.app
```

### Step 4: Create Entitlements File

Create `src-tauri/entitlements.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Network access for API calls -->
  <key>com.apple.security.network.client</key>
  <true/>

  <!-- File system access -->
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>

  <!-- SQLite database access -->
  <key>com.apple.security.app-sandbox</key>
  <true/>

  <!-- Required for notarization -->
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

### Common Signing Issues

| Issue | Solution |
|-------|----------|
| "No identity found" | Install Developer ID certificate from Apple Developer portal |
| "Code signing failed" | Ensure certificate is not expired, try `security unlock-keychain` |
| "Bundle format unrecognized" | Clean build and rebuild: `cargo clean && pnpm run build` |
| "Entitlements not valid" | Verify entitlements.plist syntax and permissions |

---

## Creating DMG Installer

DMG files provide a user-friendly installation experience.

### Automatic DMG Creation

Tauri automatically creates DMG files during build:

```bash
pnpm run build

# DMG created at:
# src-tauri/target/release/bundle/dmg/Vibing2_1.0.0_aarch64.dmg
```

### Custom DMG Configuration

Edit `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "macOS": {
      "dmg": {
        "background": "icons/dmg-background.png",
        "windowSize": {
          "width": 600,
          "height": 400
        },
        "appPosition": {
          "x": 180,
          "y": 170
        },
        "applicationFolderPosition": {
          "x": 420,
          "y": 170
        }
      }
    }
  }
}
```

### Manual DMG Creation with create-dmg

```bash
# Install create-dmg
brew install create-dmg

# Create custom DMG
create-dmg \
  --volname "Vibing2 Installer" \
  --volicon "src-tauri/icons/icon.icns" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "Vibing2.app" 180 170 \
  --hide-extension "Vibing2.app" \
  --app-drop-link 420 170 \
  --background "src-tauri/icons/dmg-background.png" \
  "Vibing2_1.0.0_custom.dmg" \
  "src-tauri/target/release/bundle/macos/Vibing2.app"
```

### Sign the DMG

```bash
# Sign DMG for distribution
codesign --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --force \
  Vibing2_1.0.0_aarch64.dmg

# Verify DMG signature
codesign -dv Vibing2_1.0.0_aarch64.dmg
```

---

## Notarization

Notarization is required for Gatekeeper approval on macOS 10.15+.

### Step 1: Create App-Specific Password

1. Visit: https://appleid.apple.com
2. Sign in with your Apple ID
3. Navigate to "App-Specific Passwords"
4. Generate new password named "Vibing2 Notarization"
5. Save the password securely

### Step 2: Store Credentials

```bash
# Store credentials in keychain
xcrun notarytool store-credentials "vibing2-notarization" \
  --apple-id "your-email@example.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "xxxx-xxxx-xxxx-xxxx"

# Verify credentials
xcrun notarytool history --keychain-profile "vibing2-notarization"
```

### Step 3: Submit for Notarization

```bash
# Navigate to DMG location
cd src-tauri/target/release/bundle/dmg

# Submit DMG for notarization
xcrun notarytool submit Vibing2_1.0.0_aarch64.dmg \
  --keychain-profile "vibing2-notarization" \
  --wait

# This will:
# 1. Upload DMG to Apple servers
# 2. Wait for notarization to complete
# 3. Display submission status
```

### Step 4: Staple Notarization Ticket

```bash
# Staple ticket to DMG
xcrun stapler staple Vibing2_1.0.0_aarch64.dmg

# Verify stapling
xcrun stapler validate Vibing2_1.0.0_aarch64.dmg
spctl -a -vv -t install Vibing2_1.0.0_aarch64.dmg
```

### Step 5: Verify Notarization

```bash
# Check notarization status
spctl -a -vv -t install Vibing2_1.0.0_aarch64.dmg

# Expected output:
# Vibing2_1.0.0_aarch64.dmg: accepted
# source=Notarized Developer ID
```

### Automated Notarization Script

Create `scripts/notarize.sh`:

```bash
#!/bin/bash
set -e

DMG_PATH="$1"
KEYCHAIN_PROFILE="vibing2-notarization"

if [ -z "$DMG_PATH" ]; then
  echo "Usage: ./notarize.sh path/to/app.dmg"
  exit 1
fi

echo "Submitting for notarization..."
xcrun notarytool submit "$DMG_PATH" \
  --keychain-profile "$KEYCHAIN_PROFILE" \
  --wait

echo "Stapling notarization ticket..."
xcrun stapler staple "$DMG_PATH"

echo "Verifying notarization..."
xcrun stapler validate "$DMG_PATH"

echo "Notarization complete!"
```

Make executable and run:

```bash
chmod +x scripts/notarize.sh
./scripts/notarize.sh src-tauri/target/release/bundle/dmg/Vibing2_1.0.0_aarch64.dmg
```

### Notarization Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid credentials" | Verify app-specific password, ensure team ID is correct |
| "Invalid binary" | Ensure app is properly signed with hardened runtime |
| "Notarization failed" | Check notarization log: `xcrun notarytool log <submission-id>` |
| "Stapling failed" | Ensure notarization completed successfully before stapling |

---

## Distribution

### Release Checklist

- [ ] Version number updated in `package.json` and `tauri.conf.json`
- [ ] All tests passing
- [ ] Changelog updated
- [ ] Built for both architectures (Apple Silicon + Intel)
- [ ] Applications signed with Developer ID
- [ ] DMG files created and signed
- [ ] Notarization completed and stapled
- [ ] Release notes prepared
- [ ] Installation tested on clean macOS system

### Architecture-Specific Builds

```bash
# Build for Apple Silicon (M1/M2/M3)
rustup target add aarch64-apple-darwin
pnpm run build -- --target aarch64-apple-darwin

# Build for Intel (x86_64)
rustup target add x86_64-apple-darwin
pnpm run build -- --target x86_64-apple-darwin

# Universal Binary (both architectures)
pnpm run build -- --target universal-apple-darwin
```

### Upload to Distribution Platform

**Option 1: Self-Hosted Download Page**

```bash
# Upload to your web server
scp src-tauri/target/release/bundle/dmg/*.dmg \
  user@yourserver.com:/var/www/downloads/

# Create checksums
cd src-tauri/target/release/bundle/dmg
shasum -a 256 *.dmg > checksums.txt
```

**Option 2: GitHub Releases**

```bash
# Create release with GitHub CLI
gh release create v1.0.0 \
  --title "Vibing2 Desktop v1.0.0" \
  --notes-file RELEASE_NOTES.md \
  src-tauri/target/release/bundle/dmg/*.dmg

# Or upload via web interface at:
# https://github.com/your-org/vibing2/releases/new
```

**Option 3: Update Server for Auto-Updates**

Configure in `tauri.conf.json`:

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://updates.vibing2.com/{{target}}/{{current_version}}"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY"
  }
}
```

---

## Troubleshooting

### Build Issues

#### Rust Compilation Errors

```bash
# Update Rust
rustup update stable

# Clean and rebuild
cd src-tauri
cargo clean
cargo build --release

# Check for dependency conflicts
cargo tree
```

#### Node.js Build Failures

```bash
# Clear caches
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml

# Reinstall
pnpm install

# Rebuild Next.js
cd .. && pnpm run build
```

#### Tauri CLI Issues

```bash
# Reinstall Tauri CLI
pnpm remove @tauri-apps/cli
pnpm add -D @tauri-apps/cli

# Verify installation
pnpm tauri info
```

### Code Signing Issues

#### Certificate Not Found

```bash
# List available identities
security find-identity -v -p codesigning

# Import certificate
security import certificate.p12 -k ~/Library/Keychains/login.keychain

# Unlock keychain
security unlock-keychain ~/Library/Keychains/login.keychain
```

#### Signing Verification Failed

```bash
# Remove old signatures
codesign --remove-signature Vibing2.app

# Re-sign with verbose output
codesign --force --deep --verbose=4 \
  --sign "Developer ID Application: Your Name" \
  Vibing2.app

# Check for issues
codesign --verify --verbose=4 Vibing2.app
```

### Notarization Issues

#### Submission Failed

```bash
# Check submission status
xcrun notarytool history --keychain-profile "vibing2-notarization"

# Get detailed log
xcrun notarytool log <submission-id> \
  --keychain-profile "vibing2-notarization"
```

#### Common Rejection Reasons

1. **Invalid Signature**: Re-sign with hardened runtime enabled
2. **Missing Entitlements**: Add required entitlements.plist
3. **Unsigned Binaries**: Ensure all nested binaries are signed
4. **Library Validation**: Add appropriate entitlements for dynamic libraries

### Runtime Issues

#### App Won't Open

```bash
# Check Gatekeeper status
spctl --status

# Allow app to run (development only)
xattr -d com.apple.quarantine Vibing2.app

# Check system logs
log show --predicate 'process == "Vibing2"' --info --last 1h
```

#### Database Access Issues

```bash
# Check database location
ls -la ~/Library/Application\ Support/com.vibing2.desktop/

# Reset database (DANGER: deletes all data)
rm -rf ~/Library/Application\ Support/com.vibing2.desktop/

# Check permissions
ls -la ~/Library/Application\ Support/
```

#### Performance Issues

```bash
# Check binary size
ls -lh src-tauri/target/release/vibing2-desktop

# Profile with Instruments
open -a Instruments Vibing2.app

# Enable debug logging
export RUST_LOG=debug
./Vibing2.app/Contents/MacOS/vibing2-desktop
```

---

## Additional Resources

### Documentation Links

- [Tauri Documentation](https://tauri.app/v2/guides/)
- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Rust Compilation Guide](https://doc.rust-lang.org/cargo/reference/profiles.html)

### Community Support

- [Tauri Discord](https://discord.gg/tauri)
- [GitHub Discussions](https://github.com/vibing2/vibing2/discussions)
- [Stack Overflow - Tauri Tag](https://stackoverflow.com/questions/tagged/tauri)

### Tools and Utilities

- [create-dmg](https://github.com/sindresorhus/create-dmg) - DMG creation tool
- [node-appdmg](https://github.com/LinusU/node-appdmg) - Node.js DMG creator
- [Suspicious Package](https://mothersruin.com/software/SuspiciousPackage/) - Installer inspector

---

## Next Steps

After successful deployment:

1. Review [DISTRIBUTION_CHECKLIST.md](/Users/I347316/dev/vibing2/vibing2-desktop/DISTRIBUTION_CHECKLIST.md) for release preparation
2. Consult [USER_INSTALLATION_GUIDE.md](/Users/I347316/dev/vibing2/vibing2-desktop/USER_INSTALLATION_GUIDE.md) to understand user experience
3. Set up automated builds with CI/CD (GitHub Actions recommended)
4. Configure analytics and crash reporting
5. Plan for update distribution strategy

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Maintainer:** Vibing2 Team
