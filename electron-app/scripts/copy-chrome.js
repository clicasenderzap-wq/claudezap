/**
 * Copies the Puppeteer-managed Chrome to a local chrome-dist/ folder
 * so electron-builder can bundle it as an extraResource.
 */
const { executablePath } = require('puppeteer');
const fs = require('fs');
const path = require('path');

const chromeSrc = executablePath();
if (!fs.existsSync(chromeSrc)) {
  console.error('[copy-chrome] Chrome não encontrado em:', chromeSrc);
  process.exit(1);
}

// e.g. C:\Users\..\.cache\puppeteer\chrome\win64-xxx\chrome-win64\chrome.exe
const chromeDir = path.dirname(chromeSrc); // chrome-win64/
const dest = path.join(__dirname, '..', 'chrome-dist');

console.log('[copy-chrome] Copiando Chrome para chrome-dist/...');
console.log('  Origem:', chromeDir);
console.log('  Destino:', dest);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dst, entry);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

copyDir(chromeDir, dest);

const sizeMB = (getFolderSize(dest) / 1024 / 1024).toFixed(0);
console.log(`[copy-chrome] ✓ Copiado: ${sizeMB} MB`);

function getFolderSize(dir) {
  let total = 0;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) total += getFolderSize(p);
    else total += stat.size;
  }
  return total;
}
