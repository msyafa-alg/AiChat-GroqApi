// Script untuk copy library ke public/vendor
const fs   = require('fs');
const path = require('path');

const vendorDir = path.join(__dirname, '../public/vendor');
if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir, { recursive: true });

// highlight.js — cari file core yang bisa dipakai di browser
const hlBase = path.join(__dirname, '../node_modules/highlight.js');

// Cari highlight.min.js atau es/highlight.js
let hlSrc = path.join(hlBase, 'highlight.min.js');
if (!fs.existsSync(hlSrc)) {
  hlSrc = path.join(hlBase, 'es/highlight.js'); // fallback
}
if (!fs.existsSync(hlSrc)) {
  // Cari di semua subfolder
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) { const r = walk(full); if (r) return r; }
      if (f === 'highlight.min.js' || f === 'highlight.js') return full;
    }
  };
  hlSrc = walk(hlBase);
}

console.log('highlight.js src:', hlSrc);
fs.copyFileSync(hlSrc, path.join(vendorDir, 'highlight.min.js'));

// CSS theme
const stylesSrc = path.join(hlBase, 'styles/github-dark-dimmed.min.css');
let cssSrc = stylesSrc;
if (!fs.existsSync(cssSrc)) {
  cssSrc = path.join(hlBase, 'styles/github-dark-dimmed.css');
}
if (!fs.existsSync(cssSrc)) {
  // Fallback ke github-dark
  cssSrc = path.join(hlBase, 'styles/github-dark.min.css');
  if (!fs.existsSync(cssSrc)) cssSrc = path.join(hlBase, 'styles/github-dark.css');
}
console.log('highlight.css src:', cssSrc);
fs.copyFileSync(cssSrc, path.join(vendorDir, 'github-dark-dimmed.min.css'));

// marked
const markedSrc = path.join(__dirname, '../node_modules/marked/marked.min.js');
console.log('marked src:', markedSrc);
fs.copyFileSync(markedSrc, path.join(vendorDir, 'marked.min.js'));

console.log('✅ Vendor files copied to public/vendor:');
console.log(fs.readdirSync(vendorDir));
