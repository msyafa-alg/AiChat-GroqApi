// Download library dari CDN dan simpan lokal
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const vendorDir = path.join(__dirname, '../public/vendor');
if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir, { recursive: true });

const files = [
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
    dest: 'highlight.min.js',
  },
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark-dimmed.min.css',
    dest: 'github-dark-dimmed.min.css',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    dest: 'marked.min.js',
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(vendorDir, dest);
    const file = fs.createWriteStream(filePath);
    https.get(url, (res) => {
      // Handle redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${dest} (${res.statusCode})`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

(async () => {
  for (const f of files) {
    try {
      await download(f.url, f.dest);
    } catch (err) {
      console.error(`❌ Failed: ${f.dest} — ${err.message}`);
    }
  }
  console.log('\nVendor files:', fs.readdirSync(vendorDir));
})();
