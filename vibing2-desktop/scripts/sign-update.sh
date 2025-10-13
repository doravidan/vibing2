#!/bin/bash

##############################################################################
# Tauri Update Signature Script
#
# This script signs update bundles using Tauri's built-in signing mechanism.
# It generates signatures required for secure update verification.
#
# Prerequisites:
#   - Tauri CLI installed (cargo install tauri-cli)
#   - Private key generated (tauri signer generate)
#
# Usage:
#   ./sign-update.sh [bundle-file]
#
# Examples:
#   ./sign-update.sh ../src-tauri/target/release/bundle/dmg/Vibing2_1.0.0_aarch64.dmg
#   ./sign-update.sh ../src-tauri/target/release/bundle/nsis/Vibing2_1.0.0_x64-setup.exe
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PRIVATE_KEY="${TAURI_SIGNING_PRIVATE_KEY}"
PRIVATE_KEY_PATH="${TAURI_SIGNING_PRIVATE_KEY_PATH:-$HOME/.tauri/vibing2.key}"

# Parse arguments
BUNDLE_FILE="$1"

##############################################################################
# Functions
##############################################################################

print_error() {
    echo -e "${RED}Error: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

check_dependencies() {
    if ! command -v tauri &> /dev/null; then
        print_error "Tauri CLI not found. Install it with: cargo install tauri-cli"
        exit 1
    fi
}

check_private_key() {
    # Check if private key is in environment variable
    if [ -n "$PRIVATE_KEY" ]; then
        print_info "Using private key from environment variable"
        return 0
    fi

    # Check if private key file exists
    if [ -f "$PRIVATE_KEY_PATH" ]; then
        print_info "Using private key from: $PRIVATE_KEY_PATH"
        PRIVATE_KEY=$(cat "$PRIVATE_KEY_PATH")
        export TAURI_SIGNING_PRIVATE_KEY="$PRIVATE_KEY"
        return 0
    fi

    print_error "Private key not found!"
    echo ""
    echo "Please do one of the following:"
    echo "  1. Set TAURI_SIGNING_PRIVATE_KEY environment variable"
    echo "  2. Create key file at: $PRIVATE_KEY_PATH"
    echo "  3. Generate a new key pair with: tauri signer generate -w ~/.tauri/vibing2.key"
    echo ""
    exit 1
}

sign_bundle() {
    local bundle_path="$1"

    if [ ! -f "$bundle_path" ]; then
        print_error "Bundle file not found: $bundle_path"
        exit 1
    fi

    local bundle_dir=$(dirname "$bundle_path")
    local bundle_name=$(basename "$bundle_path")
    local signature_file="${bundle_path}.sig"

    print_info "Signing bundle: $bundle_name"

    # Use Tauri CLI to sign the bundle
    cd "$bundle_dir"

    tauri signer sign "$bundle_name" -k "$PRIVATE_KEY" -p "" > "$signature_file"

    if [ $? -eq 0 ] && [ -f "$signature_file" ]; then
        print_success "Bundle signed successfully: ${signature_file}"
        print_info "Signature: $(cat "$signature_file")"
    else
        print_error "Failed to sign bundle"
        exit 1
    fi
}

sign_all_bundles() {
    print_info "Signing all bundles..."

    local bundle_dir="$1"
    local signed_count=0

    # Find and sign all bundle files
    find "$bundle_dir" -type f \( \
        -name "*.dmg" -o \
        -name "*.app.tar.gz" -o \
        -name "*.exe" -o \
        -name "*.msi" -o \
        -name "*.AppImage" -o \
        -name "*.deb" -o \
        -name "*.rpm" \
    \) | while read -r bundle; do
        sign_bundle "$bundle"
        ((signed_count++))
    done

    if [ $signed_count -eq 0 ]; then
        print_error "No bundle files found in: $bundle_dir"
        exit 1
    fi

    print_success "Signed $signed_count bundle(s)"
}

generate_keypair() {
    print_info "Generating new key pair..."

    mkdir -p "$(dirname "$PRIVATE_KEY_PATH")"

    tauri signer generate -w "$PRIVATE_KEY_PATH"

    if [ $? -eq 0 ]; then
        print_success "Key pair generated successfully"
        print_info "Private key saved to: $PRIVATE_KEY_PATH"
        print_info "Public key saved to: ${PRIVATE_KEY_PATH}.pub"
        echo ""
        echo "IMPORTANT: Store the private key securely!"
        echo "Add the public key to tauri.conf.json in the updater.pubkey field"
        echo ""
        echo "Public key:"
        cat "${PRIVATE_KEY_PATH}.pub"
    else
        print_error "Failed to generate key pair"
        exit 1
    fi
}

print_usage() {
    cat << EOF
Usage: ./sign-update.sh [OPTIONS] [bundle-file]

Sign Tauri update bundles for secure distribution.

OPTIONS:
    -h, --help              Show this help message
    -g, --generate          Generate a new key pair
    -a, --all <dir>         Sign all bundles in directory
    -k, --key <path>        Path to private key file

EXAMPLES:
    # Sign a single bundle
    ./sign-update.sh path/to/bundle.dmg

    # Sign all bundles in release directory
    ./sign-update.sh --all ../src-tauri/target/release/bundle

    # Generate new key pair
    ./sign-update.sh --generate

    # Sign with custom key path
    ./sign-update.sh --key ~/.tauri/custom.key bundle.dmg

ENVIRONMENT VARIABLES:
    TAURI_SIGNING_PRIVATE_KEY       Private key content
    TAURI_SIGNING_PRIVATE_KEY_PATH  Path to private key file (default: ~/.tauri/vibing2.key)

EOF
}

##############################################################################
# Main
##############################################################################

main() {
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                print_usage
                exit 0
                ;;
            -g|--generate)
                check_dependencies
                generate_keypair
                exit 0
                ;;
            -a|--all)
                check_dependencies
                check_private_key
                sign_all_bundles "$2"
                exit 0
                ;;
            -k|--key)
                PRIVATE_KEY_PATH="$2"
                shift 2
                ;;
            *)
                BUNDLE_FILE="$1"
                shift
                ;;
        esac
    done

    # Check if bundle file is provided
    if [ -z "$BUNDLE_FILE" ]; then
        print_error "No bundle file specified"
        echo ""
        print_usage
        exit 1
    fi

    # Sign the bundle
    check_dependencies
    check_private_key
    sign_bundle "$BUNDLE_FILE"
}

main "$@"
