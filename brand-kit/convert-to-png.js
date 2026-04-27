const puppeteer = require('../electron-app/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const BRAND_KIT_DIR = __dirname;
const PNG_DIR = path.join(BRAND_KIT_DIR, 'png');

if (!fs.existsSync(PNG_DIR)) fs.mkdirSync(PNG_DIR);

function getSvgDimensions(svgContent) {
  const wMatch = svgContent.match(/\bwidth="([^"]+)"/);
  const hMatch = svgContent.match(/\bheight="([^"]+)"/);
  return {
    width: wMatch ? parseInt(wMatch[1], 10) : 1080,
    height: hMatch ? parseInt(hMatch[1], 10) : 1080,
  };
}

async function convertAll() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const svgFiles = fs.readdirSync(BRAND_KIT_DIR).filter(f => f.endsWith('.svg'));
  console.log(`Converting ${svgFiles.length} SVG files...`);

  for (const file of svgFiles) {
    const svgPath = path.join(BRAND_KIT_DIR, file);
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const { width, height } = getSvgDimensions(svgContent);

    const pngName = file.replace('.svg', '.png');
    const pngPath = path.join(PNG_DIR, pngName);

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:${width}px;height:${height}px;overflow:hidden;background:transparent}
img{width:${width}px;height:${height}px;display:block}</style></head>
<body><img src="file:///${svgPath.replace(/\\/g, '/')}" width="${width}" height="${height}"/></body></html>`;

    const htmlFile = path.join(BRAND_KIT_DIR, '_tmp_render.html');
    fs.writeFileSync(htmlFile, html, 'utf8');

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(`file:///${htmlFile.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: pngPath, type: 'png', omitBackground: false });
    await page.close();

    fs.unlinkSync(htmlFile);
    console.log(`  ✓ ${pngName} (${width}x${height})`);
  }

  await browser.close();
  console.log(`\nDone! PNGs saved to: brand-kit/png/`);
}

convertAll().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
