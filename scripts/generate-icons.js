// Generate PWA icons menggunakan Canvas API via node-canvas
// Jalankan: node scripts/generate-icons.js
const fs   = require('fs');
const path = require('path');

// Buat SVG icon dan simpan sebagai file
// Browser modern bisa pakai SVG sebagai PWA icon juga
const sizes = [192, 512];

function generateIconSVG(size) {
  const r = Math.round(size * 0.22); // border radius
  const padding = Math.round(size * 0.15);
  const center = size / 2;

  // Icon: layers/stack symbol (mirip logo AsefAI)
  const s = size - padding * 2;
  const cx = center;
  const cy = center;
  const w = s;
  const h = s * 0.55;
  const layerH = h / 3;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0a0a0a"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="white" opacity="1"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="#0a0a0a"/>

  <!-- AsefAI logo: layered diamonds -->
  <g transform="translate(${cx}, ${cy})">
    <!-- Top layer -->
    <polygon
      points="${-w*0.4},${-h*0.15} 0,${-h*0.42} ${w*0.4},${-h*0.15} 0,${h*0.12}"
      fill="white" opacity="0.95"
    />
    <!-- Middle layer -->
    <polygon
      points="${-w*0.4},${h*0.05} 0,${-h*0.22} ${w*0.4},${h*0.05} 0,${h*0.32}"
      fill="white" opacity="0.7"
    />
    <!-- Bottom layer -->
    <polygon
      points="${-w*0.4},${h*0.25} 0,${-h*0.02} ${w*0.4},${h*0.25} 0,${h*0.52}"
      fill="white" opacity="0.45"
    />
  </g>
</svg>`;
}

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

sizes.forEach(size => {
  const svg = generateIconSVG(size);
  const svgPath = path.join(iconsDir, `icon-${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`✅ Generated: icon-${size}.svg`);
});

console.log('\nNote: Untuk PNG, buka file SVG di browser lalu save as PNG.');
console.log('Atau gunakan: npx svg2png-cli');
