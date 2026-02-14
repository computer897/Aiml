/**
 * PWA Icon Generator Script
 * 
 * This script generates PWA icons from the logo.png file.
 * 
 * Usage:
 *   npm install sharp
 *   node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Installing...');
  console.log('Run: npm install sharp');
  console.log('Then run this script again.');
  process.exit(1);
}

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_PNG = path.join(__dirname, 'logo.png');
const OUTPUT_DIR = path.join(__dirname, 'icons');

async function generateIcons() {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check if source PNG exists
  if (!fs.existsSync(SOURCE_PNG)) {
    console.error('Error: logo.png not found in public directory');
    process.exit(1);
  }

  console.log('Generating PWA icons from logo.png...\n');

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    
    try {
      await sharp(SOURCE_PNG)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }

  console.log('\nDone! PWA icons generated in public/icons/');
}

generateIcons().catch(console.error);
