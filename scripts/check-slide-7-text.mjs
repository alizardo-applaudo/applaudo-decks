import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const deckUrl = '/volaris-poc-flex/index.html';
const SLIDE_INDEX = 6;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
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

async function checkViewport(page, label) {
  const failures = await page.evaluate(({ slideIndex }) => {
    function nearestOverflowHidden(el) {
      let node = el.parentElement;
      while (node) {
        const style = getComputedStyle(node);
        if (style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden') {
          return node;
        }
        node = node.parentElement;
      }
      return null;
    }

    function isTextElement(el) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
      const text = el.textContent?.trim() ?? '';
      if (!text) return false;
      for (const child of el.children) {
        if (child.textContent?.trim()) return false;
      }
      return true;
    }

    const slides = document.querySelectorAll('#deck .slide');
    const slide = slides[slideIndex];
    if (!slide) return [{ reason: 'slide missing' }];

    const scope = slide.querySelector('.inner-viewport') || slide;

    const nav = document.querySelector('.nav');
    const navRect = nav?.getBoundingClientRect();
    const navTop = navRect?.top ?? window.innerHeight;

    const textEls = [];
    scope.querySelectorAll('*').forEach((el) => {
      if (isTextElement(el)) textEls.push(el);
    });

    const out = [];
    for (const el of textEls) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      const ancestor = nearestOverflowHidden(el);
      if (ancestor) {
        const a = ancestor.getBoundingClientRect();
        const tol = 1;
        if (
          rect.bottom > a.bottom + tol ||
          rect.top < a.top - tol ||
          rect.right > a.right + tol ||
          rect.left < a.left - tol
        ) {
          out.push({
            tag: el.tagName,
            class: el.className?.toString?.().slice(0, 80) || '',
            text: (el.textContent || '').trim().slice(0, 60),
            ancestor: ancestor.className?.toString?.().slice(0, 80) || ancestor.tagName,
            rect: { t: rect.top, b: rect.bottom, l: rect.left, r: rect.right },
            clip: { t: a.top, b: a.bottom, l: a.left, r: a.right },
          });
        }
      }

      if (rect.bottom > navTop - 2) {
        out.push({
          tag: el.tagName,
          class: el.className?.toString?.().slice(0, 80) || '',
          text: (el.textContent || '').trim().slice(0, 60),
          ancestor: 'nav-pill',
          rect: { t: rect.top, b: rect.bottom },
          navTop,
        });
      }
    }
    return out;
  }, { slideIndex: SLIDE_INDEX });

  const pass = failures.length === 0;
  console.log(`\n=== ${label} === ${pass ? 'PASS' : 'FAIL'} (${failures.length} issues) ===`);
  if (!pass) {
    for (const f of failures.slice(0, 15)) {
      console.log(JSON.stringify(f, null, 0));
    }
    if (failures.length > 15) console.log(`... and ${failures.length - 15} more`);
  }
  return pass;
}

const sizes = [
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1280x720', width: 1280, height: 720 },
];

const server = await staticServer();
const port = server.address().port;
const base = `http://127.0.0.1:${port}${deckUrl}`;

const browser = await chromium.launch({ channel: 'chrome' });
let allPass = true;

for (const { label, width, height } of sizes) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate((idx) => window.ApplaudoDeck?.goTo(idx), SLIDE_INDEX);
  await page.waitForTimeout(300);
  const pass = await checkViewport(page, label);
  if (!pass) allPass = false;
  await context.close();
}

await browser.close();
server.close();

console.log(`\nOverall: ${allPass ? 'PASS' : 'FAIL'}`);
process.exit(allPass ? 0 : 1);
