const sharp = require('sharp');
const path  = require('path');

const sizes = [192, 512];
const iconsDir = path.join(__dirname, '../public/icons');

(async () => {
  for (const size of sizes) {
    const svgPath = path.join(iconsDir, `icon-${size}.svg`);
    const pngPath = path.join(iconsDir, `icon-${size}.png`);
    await sharp(svgPath).resize(size, size).png().toFile(pngPath);
    console.log(`✅ icon-${size}.png`);
  }
})();
