const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../src-tauri/icons/icon.svg');
const iconsDir = path.join(__dirname, '../src-tauri/icons');

// Tauri required icon sizes
const sizes = [32, 128, 256, 512];

async function generateIcons() {
  console.log('Generating PNG icons from SVG...');

  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon_${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated ${size}x${size} PNG`);
  }

  // Also create icon.png as a copy of 128x128 for the default
  const defaultPath = path.join(iconsDir, 'icon.png');
  await sharp(svgBuffer)
    .resize(128, 128)
    .png()
    .toFile(defaultPath);

  console.log('✅ Generated icon.png (128x128)');
  console.log('\n✨ All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
