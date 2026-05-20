/**
 * Copies the Puppeteer-managed Chrome to chrome-dist/ for bundling.
 * Non-fatal: if Chrome is not found the build continues and the app
 * falls back to system Chrome (see waManager.js findChrome).
 */
const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, '..', 'chrome-dist');

let chromeSrc;
try {
  const { executablePath } = require('puppeteer');
  chromeSrc = executablePath();
} catch (e) {
  console.warn('[copy-chrome] puppeteer.executablePath() falhou:', e.message);
}

if (!chromeSrc || !fs.existsSync(chromeSrc)) {
  console.warn('[copy-chrome] Chrome não encontrado — build sem Chrome bundled. App usará Chrome do sistema.');
  fs.mkdirSync(dest, { recursive: true });
  process.exit(0);
}

const chromeDir = path.dirname(chromeSrc);
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

const sizeMB = (getFolderSize(dest) / 1024 / 1024).toFixed(0);
console.log(`[copy-chrome] ✓ Copiado: ${sizeMB} MB`);
