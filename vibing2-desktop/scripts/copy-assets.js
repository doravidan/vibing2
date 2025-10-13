#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const parentDir = path.resolve(rootDir, '..');

async function copyAssets() {
  console.log('📦 Copying assets from Next.js static export...');

  try {
    // Source: Next.js out/ directory (static export)
    const nextOutDir = path.join(parentDir, 'out');

    // Destination: public/ for Tauri
    const publicDir = path.join(rootDir, 'public');

    // Verify source directory exists
    try {
      await fs.access(nextOutDir);
      console.log('✅ Found Next.js static export at:', nextOutDir);
    } catch {
      console.error('❌ Error: Static export not found at:', nextOutDir);
      console.error('   Please run "npm run build:desktop" first');
      process.exit(1);
    }

    // Clean destination directory
    console.log('🧹 Cleaning destination directory...');
    try {
      await fs.rm(publicDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's ok
    }

    // Ensure public directory exists
    await fs.mkdir(publicDir, { recursive: true });

    // Copy all files from source to public
    console.log('📋 Copying files...');
    const stats = await copyDirectory(nextOutDir, publicDir);

    console.log('✅ Assets copied successfully!');
    console.log(`   Files copied: ${stats.files}`);
    console.log(`   Directories: ${stats.dirs}`);
    console.log(`   Source: ${nextOutDir}`);
    console.log(`   Destination: ${publicDir}`);

    // Verify critical files exist
    await verifyCriticalFiles(publicDir);

  } catch (error) {
    console.error('❌ Error copying assets:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });
  let stats = { files: 0, dirs: 0 };

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      stats.dirs++;
      const subStats = await copyDirectory(srcPath, destPath);
      stats.files += subStats.files;
      stats.dirs += subStats.dirs;
    } else {
      await fs.copyFile(srcPath, destPath);
      stats.files++;

      // Log important files
      if (entry.name.endsWith('.html') || entry.name.endsWith('.js')) {
        console.log(`   ✓ ${path.relative(src, srcPath)}`);
      }
    }
  }

  return stats;
}

async function verifyCriticalFiles(publicDir) {
  console.log('🔍 Verifying critical files...');

  const criticalFiles = [
    'index.html',
    '_next/static',
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(publicDir, file);
    try {
      await fs.access(filePath);
      console.log(`   ✓ ${file}`);
    } catch {
      console.warn(`   ⚠️  Missing: ${file}`);
    }
  }
}

copyAssets();
