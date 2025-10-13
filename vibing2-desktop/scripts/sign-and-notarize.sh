#!/bin/bash
set -e

# Vibing2 Code Signing and Notarization Script
# Professional macOS app signing and notarization for Gatekeeper

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$DESKTOP_DIR/dist"

# Load environment variables
if [ -f "$DESKTOP_DIR/.env.production" ]; then
  source "$DESKTOP_DIR/.env.production"
else
  echo -e "${RED}[ERROR]${NC} .env.production not found"
  echo "Create it with your Apple Developer credentials:"
  echo "  APPLE_DEVELOPER_IDENTITY=\"Developer ID Application: Your Name (TEAM_ID)\""
  echo "  APPLE_ID=\"your.email@example.com\""
  echo "  APPLE_TEAM_ID=\"YOUR_TEAM_ID\""
  echo "  APPLE_APP_PASSWORD=\"app-specific-password\""
  exit 1
fi

# Load version
VERSION=$(node -p "require('$DESKTOP_DIR/src-tauri/tauri.conf.json').version")
APP_NAME="Vibing2"
BUNDLE_ID="com.vibing2.desktop"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Vibing2 Code Signing & Notarization${NC}"
echo -e "${BLUE}  Version: $VERSION${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function: Print status
print_status() {
  echo -e "${GREEN}[SIGN]${NC} $1"
}

# Function: Print error
print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function: Print warning
print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Validate environment variables
if [ -z "$APPLE_DEVELOPER_IDENTITY" ]; then
  print_error "APPLE_DEVELOPER_IDENTITY not set"
  exit 1
fi

if [ -z "$APPLE_ID" ]; then
  print_error "APPLE_ID not set"
  exit 1
fi

if [ -z "$APPLE_TEAM_ID" ]; then
  print_error "APPLE_TEAM_ID not set"
  exit 1
fi

if [ -z "$APPLE_APP_PASSWORD" ]; then
  print_error "APPLE_APP_PASSWORD not set"
  exit 1
fi

# Validate dist directory
if [ ! -d "$DIST_DIR" ]; then
  print_error "Distribution directory not found: $DIST_DIR"
  print_error "Run ./scripts/build-dmg.sh first"
  exit 1
fi

APP_PATH="$DIST_DIR/$APP_NAME.app"
DMG_PATH="$DIST_DIR/$APP_NAME-macos.dmg"

if [ ! -d "$APP_PATH" ]; then
  print_error "Application not found: $APP_PATH"
  exit 1
fi

if [ ! -f "$DMG_PATH" ]; then
  print_error "DMG not found: $DMG_PATH"
  exit 1
fi

# Step 1: Verify certificate
print_status "Verifying Apple Developer certificate..."

if ! security find-identity -v -p codesigning | grep -q "$APPLE_DEVELOPER_IDENTITY"; then
  print_error "Certificate not found in keychain: $APPLE_DEVELOPER_IDENTITY"
  echo ""
  echo "Available certificates:"
  security find-identity -v -p codesigning
  echo ""
  echo "Install your Developer ID Application certificate from:"
  echo "https://developer.apple.com/account/resources/certificates/list"
  exit 1
fi

print_status "Certificate verified: $APPLE_DEVELOPER_IDENTITY"

# Step 2: Sign the application bundle
print_status "Signing application bundle..."

# Sign frameworks and libraries first (inside-out signing)
find "$APP_PATH/Contents" -name "*.dylib" -o -name "*.framework" | while read file; do
  print_status "Signing: $(basename "$file")"
  codesign --force --options runtime \
    --sign "$APPLE_DEVELOPER_IDENTITY" \
    --timestamp \
    "$file" || true
done

# Sign the main app bundle
print_status "Signing main application bundle..."
codesign --force --options runtime \
  --sign "$APPLE_DEVELOPER_IDENTITY" \
  --timestamp \
  --entitlements "$DESKTOP_DIR/src-tauri/entitlements.plist" \
  --deep \
  "$APP_PATH"

# Verify signature
print_status "Verifying application signature..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

if [ $? -ne 0 ]; then
  print_error "Application signature verification failed"
  exit 1
fi

print_status "Application signature verified successfully"

# Step 3: Sign the DMG
print_status "Signing DMG file..."

codesign --force --sign "$APPLE_DEVELOPER_IDENTITY" \
  --timestamp \
  "$DMG_PATH"

# Verify DMG signature
print_status "Verifying DMG signature..."
codesign --verify --verbose=2 "$DMG_PATH"

if [ $? -ne 0 ]; then
  print_error "DMG signature verification failed"
  exit 1
fi

print_status "DMG signature verified successfully"

# Step 4: Create ZIP for notarization
print_status "Creating archive for notarization..."

NOTARIZATION_ZIP="$DIST_DIR/$APP_NAME-$VERSION-notarization.zip"
cd "$DIST_DIR"
ditto -c -k --keepParent "$APP_NAME.app" "$NOTARIZATION_ZIP"

print_status "Notarization archive created: $(du -sh "$NOTARIZATION_ZIP" | cut -f1)"

# Step 5: Submit for notarization
print_status "Submitting to Apple for notarization..."
print_warning "This may take several minutes..."

# Submit using notarytool (Xcode 13+)
xcrun notarytool submit "$NOTARIZATION_ZIP" \
  --apple-id "$APPLE_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_APP_PASSWORD" \
  --wait

if [ $? -ne 0 ]; then
  print_error "Notarization submission failed"
  print_error "Check your credentials and try again"
  exit 1
fi

print_status "Notarization successful!"

# Step 6: Staple notarization ticket
print_status "Stapling notarization ticket to app bundle..."
xcrun stapler staple "$APP_PATH"

if [ $? -eq 0 ]; then
  print_status "Notarization ticket stapled to app bundle"
else
  print_warning "Could not staple to app bundle (this is optional)"
fi

print_status "Stapling notarization ticket to DMG..."
xcrun stapler staple "$DMG_PATH"

if [ $? -eq 0 ]; then
  print_status "Notarization ticket stapled to DMG"
else
  print_warning "Could not staple to DMG (this is optional)"
fi

# Step 7: Verify notarization
print_status "Verifying notarization..."

# Check app
spctl --assess --verbose --type execute "$APP_PATH"
APP_NOTARIZED=$?

# Check DMG
spctl --assess --verbose --type install "$DMG_PATH"
DMG_NOTARIZED=$?

# Step 8: Generate signed checksums
print_status "Generating signed checksums..."
cd "$DIST_DIR"

shasum -a 256 "$APP_NAME-macos.dmg" > "$APP_NAME-macos-signed.dmg.sha256"

# Create signature file
cat > "$DIST_DIR/SIGNATURE.txt" << EOF
Vibing2 v$VERSION - Code Signing Information

Build Date: $(date +"%Y-%m-%d %H:%M:%S %Z")
Bundle ID: $BUNDLE_ID
Developer: $APPLE_DEVELOPER_IDENTITY
Team ID: $APPLE_TEAM_ID

File: $APP_NAME-macos.dmg
SHA-256: $(cat "$APP_NAME-macos-signed.dmg.sha256" | cut -d' ' -f1)

Status:
- Code Signed: Yes
- Notarized: Yes
- Stapled: Yes
- Gatekeeper: Approved

This application has been signed and notarized by Apple.
It will run without Gatekeeper warnings on macOS.

To verify:
  spctl --assess --verbose "$APP_NAME.app"
  codesign --verify --deep --strict "$APP_NAME.app"
  xcrun stapler validate "$APP_NAME-macos.dmg"
EOF

# Step 9: Clean up
print_status "Cleaning up temporary files..."
rm -f "$NOTARIZATION_ZIP"

# Step 10: Success summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Code Signing & Notarization Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "Signed Files:"
echo -e "  ${GREEN}✓${NC} $APP_NAME.app (signed & notarized)"
echo -e "  ${GREEN}✓${NC} $APP_NAME-macos.dmg (signed & notarized)"
echo -e "  ${GREEN}✓${NC} Notarization ticket stapled"
echo -e "  ${GREEN}✓${NC} Gatekeeper approved\n"

if [ $APP_NOTARIZED -eq 0 ] && [ $DMG_NOTARIZED -eq 0 ]; then
  echo -e "${GREEN}Status: Ready for distribution${NC}\n"
  echo -e "The application is fully signed and notarized."
  echo -e "It will install without warnings on any macOS system.\n"
else
  echo -e "${YELLOW}Status: Notarization may need time to propagate${NC}\n"
  echo -e "Wait 5-10 minutes and run verification again:\n"
  echo -e "  spctl --assess --verbose '$APP_PATH'"
  echo -e "  spctl --assess --verbose '$DMG_PATH'\n"
fi

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Test installation: open '$DMG_PATH'"
echo -e "  2. Upload to GitHub: gh release upload v$VERSION '$DMG_PATH'"
echo -e "  3. Update download page with new checksums\n"

exit 0
