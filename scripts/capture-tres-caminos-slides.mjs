import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const deckUrl = '/tres-caminos/index.html';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function staticServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = req.url?.split('?')[0] || '/';
      if (path === '/') path = deckUrl;
      const filePath = join(root, path.replace(/^\//, ''));
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(readFileSync(filePath));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const captures = [
  { suffix: '390x844', width: 390, height: 844, expandScroll: true },
  { suffix: '1024x500', width: 1024, height: 500, expandScroll: false },
];

const server = await staticServer();
const port = server.address().port;
const base = `http://127.0.0.1:${port}${deckUrl}`;

const browser = await chromium.launch({ channel: 'chrome' });
const outDir = join(root, 'artifacts', 'screenshots');

for (const { suffix, width, height, expandScroll } of captures) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });

  const slideCount = await page.evaluate(() => document.querySelectorAll('#deck .slide').length);
  for (let i = 0; i < slideCount; i++) {
    await page.evaluate((idx) => window.ApplaudoDeck?.goTo(idx), i);
    const isDiagram = await page.evaluate(
      (idx) => document.querySelectorAll('#deck .slide')[idx]?.classList.contains('dos-slide'),
      i,
    );
    await page.waitForTimeout(isDiagram ? (height <= 620 ? 2000 : 1500) : 350);

    if (expandScroll) {
      const fullH = await page.evaluate(() => {
        const slide = document.querySelector('.slide.active');
        return Math.max(Math.ceil(slide?.scrollHeight || 0), window.innerHeight);
      });
      if (fullH > height) {
        await page.setViewportSize({ width, height: fullH });
        await page.waitForTimeout(400);
        await page.evaluate((idx) => window.ApplaudoDeck?.goTo(idx), i);
        await page.waitForTimeout(isDiagram ? 1200 : 300);
      }
    }

    await page.evaluate(() => {
      const slide = document.querySelector('.slide.active');
      if (slide) slide.scrollTop = 0;
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(120);

    const nn = String(i + 1).padStart(2, '0');
    const pathOut = join(outDir, `tres-caminos-slide-${nn}-${suffix}.png`);
    await page.screenshot({ path: pathOut });
    console.log(`Wrote ${pathOut}`);
  }
  await context.close();
}

await browser.close();
server.close();
