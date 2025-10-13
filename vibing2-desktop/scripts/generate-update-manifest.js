#!/usr/bin/env node

/**
 * Update Manifest Generator for Tauri Updater
 *
 * This script generates the update manifest JSON file required by Tauri's updater.
 * It should be run after building the application bundles.
 *
 * Usage:
 *   node generate-update-manifest.js <version> <release-notes> [--github]
 *
 * Examples:
 *   node generate-update-manifest.js 1.1.0 "Bug fixes and improvements"
 *   node generate-update-manifest.js 1.2.0 "New features" --github
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const BASE_URL = process.env.UPDATE_BASE_URL || 'https://releases.vibing2.com';
const GITHUB_REPO = process.env.GITHUB_REPO || 'vibing2/vibing2';
const USE_GITHUB = process.argv.includes('--github');

// Parse arguments
const version = process.argv[2];
const releaseNotes = process.argv[3] || 'Update available';

if (!version) {
  console.error('Error: Version is required');
  console.error('Usage: node generate-update-manifest.js <version> <release-notes> [--github]');
  process.exit(1);
}

// Paths
const bundleDir = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'bundle');
const outputDir = path.join(__dirname, '..', 'releases');
const signaturesDir = path.join(__dirname, '..', 'signatures');

// Ensure output directories exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

if (!fs.existsSync(signaturesDir)) {
  fs.mkdirSync(signaturesDir, { recursive: true });
}

/**
 * Calculate SHA256 hash of a file
 */
function calculateHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Read signature file
 */
function readSignature(signaturePath) {
  if (fs.existsSync(signaturePath)) {
    return fs.readFileSync(signaturePath, 'utf8').trim();
  }
  console.warn(`Warning: Signature file not found: ${signaturePath}`);
  return '';
}

/**
 * Generate platform-specific manifest
 */
function generatePlatformManifest(platform, arch, bundlePath, signaturePath) {
  const fileName = path.basename(bundlePath);
  const hash = calculateHash(bundlePath);
  const size = getFileSize(bundlePath);
  const signature = readSignature(signaturePath);

  const url = USE_GITHUB
    ? `https://github.com/${GITHUB_REPO}/releases/download/v${version}/${fileName}`
    : `${BASE_URL}/${platform}/${arch}/${version}/${fileName}`;

  return {
    version,
    date: new Date().toISOString(),
    platforms: {
      [`${platform}-${arch}`]: {
        signature,
        url,
        format: platform === 'darwin' ? 'dmg' : platform === 'windows' ? 'nsis' : 'appimage',
        hash,
        size,
      },
    },
    notes: releaseNotes,
  };
}

/**
 * Find bundle files
 */
function findBundleFiles() {
  const bundles = [];

  // macOS DMG
  const dmgDir = path.join(bundleDir, 'dmg');
  if (fs.existsSync(dmgDir)) {
    const dmgFiles = fs.readdirSync(dmgDir).filter(f => f.endsWith('.dmg'));
    dmgFiles.forEach(file => {
      const bundlePath = path.join(dmgDir, file);
      const signaturePath = path.join(dmgDir, `${file}.sig`);

      bundles.push({
        platform: 'darwin',
        arch: file.includes('aarch64') ? 'aarch64' : 'x86_64',
        bundlePath,
        signaturePath,
        fileName: file,
      });
    });
  }

  // macOS App Bundle
  const macosDir = path.join(bundleDir, 'macos');
  if (fs.existsSync(macosDir)) {
    const appFiles = fs.readdirSync(macosDir).filter(f => f.endsWith('.app.tar.gz'));
    appFiles.forEach(file => {
      const bundlePath = path.join(macosDir, file);
      const signaturePath = path.join(macosDir, `${file}.sig`);

      bundles.push({
        platform: 'darwin',
        arch: file.includes('aarch64') ? 'aarch64' : 'x86_64',
        bundlePath,
        signaturePath,
        fileName: file,
      });
    });
  }

  // Windows NSIS
  const nsisDir = path.join(bundleDir, 'nsis');
  if (fs.existsSync(nsisDir)) {
    const exeFiles = fs.readdirSync(nsisDir).filter(f => f.endsWith('.exe'));
    exeFiles.forEach(file => {
      const bundlePath = path.join(nsisDir, file);
      const signaturePath = path.join(nsisDir, `${file}.sig`);

      bundles.push({
        platform: 'windows',
        arch: file.includes('x64') ? 'x86_64' : 'x86',
        bundlePath,
        signaturePath,
        fileName: file,
      });
    });
  }

  // Linux AppImage
  const appimageDir = path.join(bundleDir, 'appimage');
  if (fs.existsSync(appimageDir)) {
    const appimageFiles = fs.readdirSync(appimageDir).filter(f => f.endsWith('.AppImage'));
    appimageFiles.forEach(file => {
      const bundlePath = path.join(appimageDir, file);
      const signaturePath = path.join(appimageDir, `${file}.sig`);

      bundles.push({
        platform: 'linux',
        arch: file.includes('aarch64') ? 'aarch64' : 'x86_64',
        bundlePath,
        signaturePath,
        fileName: file,
      });
    });
  }

  return bundles;
}

/**
 * Generate combined manifest for all platforms
 */
function generateCombinedManifest(bundles) {
  const platforms = {};

  bundles.forEach(bundle => {
    const hash = calculateHash(bundle.bundlePath);
    const size = getFileSize(bundle.bundlePath);
    const signature = readSignature(bundle.signaturePath);

    const url = USE_GITHUB
      ? `https://github.com/${GITHUB_REPO}/releases/download/v${version}/${bundle.fileName}`
      : `${BASE_URL}/${bundle.platform}/${bundle.arch}/${version}/${bundle.fileName}`;

    const platformKey = `${bundle.platform}-${bundle.arch}`;

    let format = 'app';
    if (bundle.platform === 'darwin' && bundle.fileName.endsWith('.dmg')) {
      format = 'dmg';
    } else if (bundle.platform === 'windows') {
      format = 'nsis';
    } else if (bundle.platform === 'linux') {
      format = 'appimage';
    }

    platforms[platformKey] = {
      signature,
      url,
      format,
      hash,
      size,
    };
  });

  return {
    version,
    date: new Date().toISOString(),
    platforms,
    notes: releaseNotes,
  };
}

/**
 * Main execution
 */
function main() {
  console.log('Generating update manifest...');
  console.log(`Version: ${version}`);
  console.log(`Release Notes: ${releaseNotes}`);
  console.log(`Base URL: ${USE_GITHUB ? `GitHub (${GITHUB_REPO})` : BASE_URL}`);
  console.log('');

  // Find all bundle files
  const bundles = findBundleFiles();

  if (bundles.length === 0) {
    console.error('Error: No bundle files found');
    console.error(`Searched in: ${bundleDir}`);
    console.error('Please build the application first: npm run tauri build');
    process.exit(1);
  }

  console.log(`Found ${bundles.length} bundle(s):`);
  bundles.forEach(bundle => {
    console.log(`  - ${bundle.platform}-${bundle.arch}: ${bundle.fileName}`);
  });
  console.log('');

  // Generate combined manifest
  const manifest = generateCombinedManifest(bundles);

  // Save manifest
  const manifestPath = path.join(outputDir, `${version}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✓ Generated manifest: ${manifestPath}`);

  // Save latest.json (for version checking)
  const latestPath = path.join(outputDir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(manifest, null, 2));
  console.log(`✓ Generated latest manifest: ${latestPath}`);

  // Copy bundles to releases directory
  const versionDir = path.join(outputDir, version);
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  bundles.forEach(bundle => {
    const destPath = path.join(versionDir, bundle.fileName);
    fs.copyFileSync(bundle.bundlePath, destPath);
    console.log(`✓ Copied bundle: ${bundle.fileName}`);

    // Copy signature
    if (fs.existsSync(bundle.signaturePath)) {
      const sigDestPath = path.join(versionDir, `${bundle.fileName}.sig`);
      fs.copyFileSync(bundle.signaturePath, sigDestPath);
      console.log(`✓ Copied signature: ${bundle.fileName}.sig`);
    }
  });

  // Generate version list
  const versions = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.json') && f !== 'latest.json' && f !== 'versions.json')
    .map(f => f.replace('.json', ''))
    .sort((a, b) => {
      // Sort versions in descending order
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aNum = aParts[i] || 0;
        const bNum = bParts[i] || 0;

        if (aNum !== bNum) {
          return bNum - aNum;
        }
      }

      return 0;
    });

  const versionsListPath = path.join(outputDir, 'versions.json');
  fs.writeFileSync(versionsListPath, JSON.stringify({
    latest: version,
    versions,
    updated: new Date().toISOString(),
  }, null, 2));
  console.log(`✓ Updated versions list: ${versionsListPath}`);

  console.log('');
  console.log('✓ Update manifest generation complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Upload releases to your update server or GitHub releases');
  console.log('2. Ensure the updater endpoint in tauri.conf.json is configured correctly');
  console.log('3. Test the update process in a production build');
}

// Run main function
try {
  main();
} catch (error) {
  console.error('Error generating manifest:', error);
  process.exit(1);
}
