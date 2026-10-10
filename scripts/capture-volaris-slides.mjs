import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const deckUrl = '/volaris-poc-flex/index.html';

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

const sizes = [
  { suffix: '1440x900', width: 1440, height: 900 },
  { suffix: '1280x720', width: 1280, height: 720 },
];

const server = await staticServer();
const port = server.address().port;
const base = `http://127.0.0.1:${port}${deckUrl}`;

const browser = await chromium.launch({ channel: 'chrome' });
const outDir = join(root, 'artifacts', 'screenshots');

for (const { suffix, width, height } of sizes) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });

  const slideCount = await page.evaluate(() => document.querySelectorAll('#deck .slide').length);
  for (let i = 0; i < slideCount; i++) {
    await page.evaluate((idx) => {
      if (window.ApplaudoDeck?.goTo) window.ApplaudoDeck.goTo(idx);
    }, i);

    await page.waitForTimeout(i === 2 ? 1200 : 250);

    const nn = String(i + 1).padStart(2, '0');
    const pathBase = join(outDir, `volaris-slide-${nn}`);
    await page.screenshot({ path: `${pathBase}-${suffix}.png` });
    if (suffix === '1440x900') {
      await page.screenshot({ path: `${pathBase}.png` });
    }
    console.log(`Wrote slide ${nn} @ ${suffix}`);
  }
  await context.close();
}

await browser.close();
server.close();
