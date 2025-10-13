#!/usr/bin/env node

/**
 * Simple icon generator for Vibing2 Desktop
 *
 * This script creates a basic placeholder icon using Node.js.
 * For better results, use the HTML generator (generate-icon.html)
 * or a professional design tool like Figma or Sketch.
 *
 * Usage:
 *   node generate-basic-icon.js
 *
 * Requirements:
 *   - Node.js 16+
 *   - canvas package (npm install canvas)
 */

const fs = require('fs');
const path = require('path');

// Try to load canvas, provide helpful error if not installed
let Canvas;
try {
  Canvas = require('canvas');
} catch (error) {
  console.error('\n❌ Error: canvas package not installed\n');
  console.log('To use this script, install the canvas package:');
  console.log('  npm install canvas');
  console.log('\nAlternatively, use the HTML generator:');
  console.log('  open generate-icon.html\n');
  process.exit(1);
}

const { createCanvas } = Canvas;

/**
 * Draw Vibing2 icon at specified size
 */
function drawIcon(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / 1024;

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  // Enable anti-aliasing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'best';

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#8B5CF6'); // purple-500
  gradient.addColorStop(1, '#EC4899'); // pink-500

  // Draw rounded rectangle background
  const cornerRadius = 225 * scale;
  ctx.fillStyle = gradient;
  ctx.beginPath();

  // Rounded rectangle path
  ctx.moveTo(cornerRadius, 0);
  ctx.lineTo(size - cornerRadius, 0);
  ctx.arcTo(size, 0, size, cornerRadius, cornerRadius);
  ctx.lineTo(size, size - cornerRadius);
  ctx.arcTo(size, size, size - cornerRadius, size, cornerRadius);
  ctx.lineTo(cornerRadius, size);
  ctx.arcTo(0, size, 0, size - cornerRadius, cornerRadius);
  ctx.lineTo(0, cornerRadius);
  ctx.arcTo(0, 0, cornerRadius, 0, cornerRadius);
  ctx.closePath();
  ctx.fill();

  // Scale helper
  const s = (val) => val * scale;

  // Draw "V" shape
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.moveTo(s(280), s(320));
  ctx.lineTo(s(420), s(680));
  ctx.lineTo(s(480), s(680));
  ctx.lineTo(s(340), s(320));
  ctx.closePath();
  ctx.fill();

  // Draw "2" shape (simplified)
  ctx.beginPath();
  ctx.moveTo(s(544), s(320));
  ctx.lineTo(s(544), s(260));
  ctx.lineTo(s(700), s(260));
  ctx.arcTo(s(760), s(320), s(760), s(420), s(60));
  ctx.lineTo(s(760), s(460));
  ctx.arcTo(s(700), s(540), s(600), s(540), s(60));
  ctx.lineTo(s(520), s(560));
  ctx.lineTo(s(700), s(680));
  ctx.lineTo(s(544), s(680));
  ctx.lineTo(s(400), s(540));
  ctx.lineTo(s(700), s(540));
  ctx.arcTo(s(720), s(520), s(720), s(480), s(20));
  ctx.lineTo(s(720), s(440));
  ctx.arcTo(s(700), s(380), s(640), s(380), s(20));
  ctx.lineTo(s(544), s(380));
  ctx.closePath();
  ctx.fill();

  // Draw wave lines (only at larger sizes)
  if (size >= 64) {
    ctx.lineWidth = s(16);
    ctx.lineCap = 'round';

    // Top wave
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.beginPath();
    ctx.moveTo(s(320), s(200));
    ctx.quadraticCurveTo(s(380), s(180), s(440), s(200));
    ctx.stroke();

    // Middle wave
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(s(280), s(240));
    ctx.quadraticCurveTo(s(340), s(220), s(400), s(240));
    ctx.stroke();

    // Bottom wave
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(s(240), s(280));
    ctx.quadraticCurveTo(s(300), s(260), s(360), s(280));
    ctx.stroke();

    ctx.globalAlpha = 1.0;
  }

  // Draw sparkle dots (only at larger sizes)
  if (size >= 32) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(s(720), s(280), s(12), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(s(760), s(320), s(8), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(s(780), s(360), s(10), 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw bottom accent line (only at larger sizes)
  if (size >= 64) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    const lineY = s(740);
    const lineHeight = s(12);
    const lineRadius = s(6);

    ctx.beginPath();
    ctx.moveTo(s(240) + lineRadius, lineY);
    ctx.lineTo(s(784) - lineRadius, lineY);
    ctx.arcTo(s(784), lineY, s(784), lineY + lineRadius, lineRadius);
    ctx.lineTo(s(784), lineY + lineHeight - lineRadius);
    ctx.arcTo(s(784), lineY + lineHeight, s(784) - lineRadius, lineY + lineHeight, lineRadius);
    ctx.lineTo(s(240) + lineRadius, lineY + lineHeight);
    ctx.arcTo(s(240), lineY + lineHeight, s(240), lineY + lineHeight - lineRadius, lineRadius);
    ctx.lineTo(s(240), lineY + lineRadius);
    ctx.arcTo(s(240), lineY, s(240) + lineRadius, lineY, lineRadius);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Generate icon at specific size
 */
function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  drawIcon(canvas);

  const buffer = canvas.toBuffer('image/png');
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, buffer);

  console.log(`✓ Generated ${filename} (${size}x${size})`);
}

/**
 * Main function
 */
function main() {
  console.log('\n🎨 Vibing2 Icon Generator\n');

  try {
    // Generate master icon
    generateIcon(1024, 'icon.png');

    // Generate additional sizes
    generateIcon(512, 'icon-512.png');
    generateIcon(256, 'icon-256.png');
    generateIcon(128, 'icon-128.png');
    generateIcon(64, 'icon-64.png');
    generateIcon(32, 'icon-32.png');
    generateIcon(16, 'icon-16.png');

    console.log('\n✅ All icons generated successfully!\n');
    console.log('Next steps:');
    console.log('  1. Review icon.png (1024x1024)');
    console.log('  2. Run: pnpm tauri icon src-tauri/icons/icon.png');
    console.log('  3. Build your app: pnpm tauri build\n');

  } catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    console.log('\nTry using the HTML generator instead:');
    console.log('  open generate-icon.html\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { drawIcon, generateIcon };
