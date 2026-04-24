const { Resvg } = require('@resvg/resvg-js');
const png2icons = require('png2icons');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'source');
const OUT = path.join(__dirname, '..', 'electron-app', 'assets');

fs.mkdirSync(OUT, { recursive: true });

function svgToPng(svgPath, width, height) {
  const svg = fs.readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: false },
  });
  const rendered = resvg.render();
  return rendered.asPng();
}

async function generate() {
  console.log('🎨 Gerando ícones ClaudeZap...\n');

  // ── icon.png (256x256) — used by Electron BrowserWindow ──────────────────
  console.log('  icon.png (256x256)...');
  const icon256 = svgToPng(path.join(SRC, 'icon.svg'), 256, 256);
  fs.writeFileSync(path.join(OUT, 'icon.png'), icon256);

  // ── icon@2x.png (512x512) — retina ───────────────────────────────────────
  console.log('  icon@2x.png (512x512)...');
  const icon512 = svgToPng(path.join(SRC, 'icon.svg'), 512, 512);
  fs.writeFileSync(path.join(OUT, 'icon@2x.png'), icon512);

  // ── icon.ico — Windows installer icon (multi-size) ───────────────────────
  console.log('  icon.ico (multi-size: 16/32/48/64/128/256)...');
  const icoBuffer = png2icons.createICO(icon512, png2icons.BILINEAR, 0, true, true);
  if (!icoBuffer) throw new Error('Falha ao criar ICO');
  fs.writeFileSync(path.join(OUT, 'icon.ico'), icoBuffer);

  // ── tray.png (22x22) — system tray ───────────────────────────────────────
  console.log('  tray.png (22x22)...');
  const tray22 = svgToPng(path.join(SRC, 'tray.svg'), 22, 22);
  fs.writeFileSync(path.join(OUT, 'tray.png'), tray22);

  // Also save a 32x32 tray for higher DPI
  console.log('  tray@2x.png (32x32)...');
  const tray32 = svgToPng(path.join(SRC, 'tray.svg'), 32, 32);
  fs.writeFileSync(path.join(OUT, 'tray@2x.png'), tray32);

  // ── logo.png (128x128) — login screen (icon only, HTML has the text) ─────
  console.log('  logo.png (128x128)...');
  const logoPng = svgToPng(path.join(SRC, 'icon.svg'), 128, 128);
  fs.writeFileSync(path.join(OUT, 'logo.png'), logoPng);

  // Preview sizes for debugging
  const sizes = [16, 32, 64, 128, 256, 512];
  console.log('\n  Tamanhos de preview...');
  const previewDir = path.join(__dirname, 'preview');
  fs.mkdirSync(previewDir, { recursive: true });
  for (const size of sizes) {
    const buf = svgToPng(path.join(SRC, 'icon.svg'), size, size);
    fs.writeFileSync(path.join(previewDir, `icon-${size}.png`), buf);
    console.log(`    icon-${size}.png ✓`);
  }

  console.log('\n✅ Todos os ícones gerados em:', OUT);
  console.log('\nArquivos criados:');
  for (const f of fs.readdirSync(OUT)) {
    const stat = fs.statSync(path.join(OUT, f));
    console.log(`  ${f.padEnd(20)} ${(stat.size / 1024).toFixed(1)} KB`);
  }
}

generate().catch((e) => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
