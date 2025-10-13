#!/bin/bash
set -e

# Vibing2 Version Bump Script
# Automatically updates version across all files

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DESKTOP_DIR")"

TAURI_CONF="$DESKTOP_DIR/src-tauri/tauri.conf.json"
DESKTOP_PACKAGE="$DESKTOP_DIR/package.json"
ROOT_PACKAGE="$PROJECT_ROOT/package.json"
CARGO_TOML="$DESKTOP_DIR/src-tauri/Cargo.toml"

# Functions
print_status() {
  echo -e "${GREEN}[VERSION]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Get current version
CURRENT_VERSION=$(node -p "require('$TAURI_CONF').version")

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Vibing2 Version Bump${NC}"
echo -e "${BLUE}  Current: $CURRENT_VERSION${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Parse version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Determine bump type
BUMP_TYPE="${1:-patch}"

case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    # Custom version provided
    if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      NEW_VERSION="$1"
    else
      print_error "Invalid version format. Use: major, minor, patch, or X.Y.Z"
      exit 1
    fi
    ;;
esac

# Calculate new version if not custom
if [ -z "$NEW_VERSION" ]; then
  NEW_VERSION="$MAJOR.$MINOR.$PATCH"
fi

echo -e "New version: ${GREEN}$NEW_VERSION${NC}"
echo -e "Bump type: ${BLUE}$BUMP_TYPE${NC}\n"

# Confirm
if [ "${2}" != "--yes" ]; then
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# Update tauri.conf.json
print_status "Updating tauri.conf.json..."
node -e "
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('$TAURI_CONF', 'utf8'));
  config.version = '$NEW_VERSION';
  fs.writeFileSync('$TAURI_CONF', JSON.stringify(config, null, 2) + '\n');
"

# Update desktop package.json
print_status "Updating desktop package.json..."
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('$DESKTOP_PACKAGE', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('$DESKTOP_PACKAGE', JSON.stringify(pkg, null, 2) + '\n');
"

# Update root package.json
print_status "Updating root package.json..."
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('$ROOT_PACKAGE', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('$ROOT_PACKAGE', JSON.stringify(pkg, null, 2) + '\n');
"

# Update Cargo.toml
print_status "Updating Cargo.toml..."
if [ -f "$CARGO_TOML" ]; then
  sed -i.bak "s/^version = \".*\"/version = \"$NEW_VERSION\"/" "$CARGO_TOML"
  rm -f "$CARGO_TOML.bak"
fi

# Update Cargo.lock
print_status "Updating Cargo.lock..."
cd "$DESKTOP_DIR/src-tauri"
cargo update -p vibing2-desktop 2>/dev/null || true

# Generate changelog entry
print_status "Generating changelog entry..."

CHANGELOG="$PROJECT_ROOT/CHANGELOG.md"
TODAY=$(date +"%Y-%m-%d")

# Create changelog if it doesn't exist
if [ ! -f "$CHANGELOG" ]; then
  cat > "$CHANGELOG" << EOF
# Changelog

All notable changes to Vibing2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF
fi

# Add new version entry
TEMP_CHANGELOG=$(mktemp)
cat > "$TEMP_CHANGELOG" << EOF
# Changelog

All notable changes to Vibing2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [$NEW_VERSION] - $TODAY

### Added
-

### Changed
-

### Fixed
-

### Security
-

EOF

# Append old changelog (skip header)
tail -n +7 "$CHANGELOG" >> "$TEMP_CHANGELOG"
mv "$TEMP_CHANGELOG" "$CHANGELOG"

print_status "Changelog template created at: $CHANGELOG"
print_warning "Remember to fill in the changelog details!"

# Git operations
print_status "Creating git commit..."

cd "$PROJECT_ROOT"

# Stage changes
git add "$TAURI_CONF" "$DESKTOP_PACKAGE" "$ROOT_PACKAGE" "$CARGO_TOML" "$DESKTOP_DIR/src-tauri/Cargo.lock" "$CHANGELOG"

# Commit
git commit -m "chore: bump version to $NEW_VERSION

- Updated all version files
- Generated changelog template

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Create tag
print_status "Creating git tag..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Success
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Version Bump Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "Version: ${BLUE}$CURRENT_VERSION${NC} → ${GREEN}$NEW_VERSION${NC}\n"
echo -e "Updated files:"
echo -e "  ${GREEN}✓${NC} tauri.conf.json"
echo -e "  ${GREEN}✓${NC} package.json (desktop)"
echo -e "  ${GREEN}✓${NC} package.json (root)"
echo -e "  ${GREEN}✓${NC} Cargo.toml"
echo -e "  ${GREEN}✓${NC} Cargo.lock"
echo -e "  ${GREEN}✓${NC} CHANGELOG.md\n"
echo -e "Git:"
echo -e "  ${GREEN}✓${NC} Committed changes"
echo -e "  ${GREEN}✓${NC} Created tag v$NEW_VERSION\n"
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Edit CHANGELOG.md and add release notes"
echo -e "  2. Push changes: git push origin main"
echo -e "  3. Push tag: git push origin v$NEW_VERSION"
echo -e "  4. Build release: ./scripts/build-dmg.sh"
echo -e "  5. Sign and notarize: ./scripts/sign-and-notarize.sh"
echo -e "  6. Create GitHub release: gh release create v$NEW_VERSION\n"

exit 0
