# PWA Icons Directory

This directory should contain PNG icons for the Progressive Web App.

## Required Icons

Generate PNG icons from the `logo.svg` file in the following sizes:

- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels (maskable)
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels (maskable)

## How to Generate Icons

### Option 1: Online Tool
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload the `../logo.svg` file
3. Download the generated icon pack
4. Extract the icons to this folder

### Option 2: Using Node.js (sharp)
```bash
npm install sharp
node generate-icons.js
```

### Option 3: Using Inkscape (CLI)
```bash
inkscape logo.svg --export-type=png --export-width=192 --export-filename=icons/icon-192x192.png
```

### Option 4: Using ImageMagick
```bash
convert logo.svg -resize 192x192 icons/icon-192x192.png
```

## Maskable Icons

The 192x192 and 512x512 icons should have "safe zone" padding for maskable icons.
The safe zone is the inner 80% of the icon (10% padding on each side).

Learn more: https://web.dev/maskable-icon/
