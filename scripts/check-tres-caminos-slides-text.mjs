import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const deckUrl = '/tres-caminos/index.html';
const SLIDE_COUNT = 12;
const DOS_SLIDE_INDEX = 6;
const MATRIX_SLIDE_INDEX = 2;
const MATRIX_CARD_GAP_PX = 8;
const MATRIX_BOARD_INSET_PX = 2;

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

async function checkSlide(page, slideIndex, label) {
  const failures = await page.evaluate(({ slideIndex: idx }) => {
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
      if (el.closest('.foot')) return false;
      const text = el.textContent?.trim() ?? '';
      if (!text) return false;
      for (const child of el.children) {
        if (child.textContent?.trim()) return false;
      }
      return true;
    }

    function getScope(slide) {
      if (slide.classList.contains('dos-slide')) {
        const parts = [slide.querySelector('.dos-header'), slide.querySelector('.dos-stage')].filter(Boolean);
        return parts.length ? parts : [slide];
      }
      const single =
        slide.querySelector('.inner-viewport') ||
        slide.querySelector('.inner-spacious') ||
        slide.querySelector('.inner.center');
      return single ? [single] : [slide];
    }

    const slides = document.querySelectorAll('#deck .slide');
    const slide = slides[idx];
    if (!slide) return [{ reason: 'slide missing', slide: idx + 1 }];

    const scopes = getScope(slide);
    const nav = document.querySelector('.nav');
    const navTop = nav?.getBoundingClientRect().top ?? window.innerHeight;

    const out = [];
    for (const scope of scopes) {
      scope.querySelectorAll('*').forEach((el) => {
        if (!isTextElement(el)) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

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
              slide: idx + 1,
              tag: el.tagName,
              class: el.className?.toString?.().slice(0, 80) || '',
              text: (el.textContent || '').trim().slice(0, 60),
              ancestor: ancestor.className?.toString?.().slice(0, 80) || ancestor.tagName,
            });
          }
        }

        if (rect.bottom > navTop - 2) {
          out.push({
            slide: idx + 1,
            tag: el.tagName,
            class: el.className?.toString?.().slice(0, 80) || '',
            text: (el.textContent || '').trim().slice(0, 60),
            ancestor: 'nav-pill',
          });
        }
      });
    }
    return out;
  }, { slideIndex });

  const pass = failures.length === 0;
  console.log(`  slide ${slideIndex + 1} @ ${label}: ${pass ? 'PASS' : 'FAIL'} (${failures.length})`);
  if (!pass) {
    for (const f of failures.slice(0, 8)) console.log('   ', JSON.stringify(f));
  }
  return pass;
}

async function checkMatrixCards(page, slideIndex, label) {
  if (slideIndex !== MATRIX_SLIDE_INDEX) return true;

  const failures = await page.evaluate(
    ({ gap, inset }) => {
      const slide = document.querySelectorAll('#deck .slide')[2];
      const board = slide?.querySelector('.matrix-board');
      if (!board) return [{ reason: 'matrix-board missing', slide: 3 }];

      const cards = [...board.querySelectorAll('.matrix-case')];
      const boardRect = board.getBoundingClientRect();
      const out = [];

      function padRect(r) {
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      }

      function overlaps(a, b) {
        return !(
          a.right + gap <= b.left ||
          b.right + gap <= a.left ||
          a.bottom + gap <= b.top ||
          b.bottom + gap <= a.top
        );
      }

      const rects = cards.map((el) => ({ el, rect: padRect(el.getBoundingClientRect()), cls: el.className }));

      for (const { el, rect, cls } of rects) {
        if (
          rect.top < boardRect.top + inset ||
          rect.left < boardRect.left + inset ||
          rect.bottom > boardRect.bottom - inset ||
          rect.right > boardRect.right - inset
        ) {
          out.push({
            slide: 3,
            reason: 'card-outside-board',
            card: cls,
            text: (el.querySelector('h4')?.textContent || '').trim(),
          });
        }
      }

      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          if (overlaps(rects[i].rect, rects[j].rect)) {
            out.push({
              slide: 3,
              reason: 'card-overlap',
              a: rects[i].cls,
              b: rects[j].cls,
            });
          }
        }
      }

      return out;
    },
    { gap: MATRIX_CARD_GAP_PX, inset: MATRIX_BOARD_INSET_PX },
  );

  const pass = failures.length === 0;
  console.log(`  slide 3 matrix cards @ ${label}: ${pass ? 'PASS' : 'FAIL'} (${failures.length})`);
  if (!pass) {
    for (const f of failures) console.log('   ', JSON.stringify(f));
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
  console.log(`\n=== ${label} ===`);
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });

  for (let i = 0; i < SLIDE_COUNT; i++) {
    await page.evaluate((idx) => window.ApplaudoDeck?.goTo(idx), i);
    const isDos = i === DOS_SLIDE_INDEX;
    await page.waitForTimeout(isDos ? 1200 : 300);
    const pass = await checkSlide(page, i, label);
    if (!pass) allPass = false;
    if (i === MATRIX_SLIDE_INDEX) {
      const matrixPass = await checkMatrixCards(page, i, label);
      if (!matrixPass) allPass = false;
    }
  }
  await context.close();
}

await browser.close();
server.close();

console.log(`\nOverall: ${allPass ? 'PASS' : 'FAIL'}`);
process.exit(allPass ? 0 : 1);
