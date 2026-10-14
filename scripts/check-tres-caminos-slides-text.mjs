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
const DECISION_SLIDE_INDEX = 10;
const MATRIX_CARD_GAP_PX = 8;
const MATRIX_BOARD_INSET_PX = 2;
const DECISION_NODE_GAP_PX = 6;
const DECISION_NAV_CLEARANCE_PX = 24;

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

async function checkContentSlideTitleTypography(page, label) {
  const failures = await page.evaluate(() => {
    const slides = [...document.querySelectorAll('#deck > .slide')];
    function mainTitle(slide) {
      return slide.querySelector('.slide-head h2.hl') || slide.querySelector('.dos-header h2');
    }
    const rows = [];
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (i === 0 || slide.classList.contains('cierre-slide')) continue;
      const h = mainTitle(slide);
      if (!h) {
        rows.push({ slide: i + 1, reason: 'content-title-missing' });
        continue;
      }
      const cs = getComputedStyle(h);
      rows.push({
        slide: i + 1,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
      });
    }
    const ref = rows.find((r) => r.slide === 2 && r.fontSize);
    if (!ref) return [{ reason: 'reference-title-slide-2-missing' }];
    const out = [];
    for (const r of rows) {
      if (r.reason) {
        out.push(r);
        continue;
      }
      if (r.fontSize !== ref.fontSize || r.fontWeight !== ref.fontWeight || r.lineHeight !== ref.lineHeight) {
        out.push({
          slide: r.slide,
          reason: 'title-typography-mismatch',
          fontSize: r.fontSize,
          fontWeight: r.fontWeight,
          lineHeight: r.lineHeight,
          refSlide: 2,
          refFontSize: ref.fontSize,
          refFontWeight: ref.fontWeight,
          refLineHeight: ref.lineHeight,
        });
      }
    }
    return out;
  });

  const pass = failures.length === 0;
  console.log(`  content slide title typography @ ${label}: ${pass ? 'PASS' : 'FAIL'} (${failures.length})`);
  if (!pass) {
    for (const f of failures.slice(0, 12)) console.log('   ', JSON.stringify(f));
  }
  return pass;
}

async function checkDecisionDiagram(page, slideIndex, label) {
  if (slideIndex !== DECISION_SLIDE_INDEX) return true;

  const failures = await page.evaluate(({ gap, pad, navClearance }) => {
    const fr = document.getElementById('decisionFrame');
    const doc = fr?.contentDocument;
    const win = fr?.contentWindow;
    if (!doc || !win) return [{ slide: 11, reason: 'decision-iframe-missing' }];

    const canvas = doc.getElementById('canvas');
    if (!canvas) return [{ slide: 11, reason: 'decision-canvas-missing' }];

    function overlaps(a, b, g = 0) {
      return !(
        a.right + g <= b.left ||
        b.right + g <= a.left ||
        a.bottom + g <= b.top ||
        b.bottom + g <= a.top
      );
    }

    const out = [];
    const canvasRect = canvas.getBoundingClientRect();
    const nodeEls = [
      ...doc.querySelectorAll('.box'),
      doc.getElementById('n-team-card'),
      doc.getElementById('n-signal'),
    ].filter(Boolean);

    const rects = nodeEls.map((el) => ({
      el,
      id: el.id || el.className,
      rect: el.getBoundingClientRect(),
    }));

    for (const { el, id, rect } of rects) {
      if (
        rect.bottom > canvasRect.bottom + pad ||
        rect.top < canvasRect.top - pad ||
        rect.right > canvasRect.right + pad ||
        rect.left < canvasRect.left - pad
      ) {
        out.push({ slide: 11, reason: 'node-outside-canvas', id, text: (el.textContent || '').slice(0, 40) });
      }
    }

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (overlaps(rects[i].rect, rects[j].rect, gap)) {
          out.push({ slide: 11, reason: 'node-overlap', a: rects[i].id, b: rects[j].id });
        }
      }
    }

    const textRects = [...doc.querySelectorAll('.method-cap, .team-header, .stack .seg .t, .signal')].map(
      (el) => el.getBoundingClientRect(),
    );

    function pointInRect(x, y, r, inset = 3) {
      return (
        x >= r.left + inset &&
        x <= r.right - inset &&
        y >= r.top + inset &&
        y <= r.bottom - inset
      );
    }

    function sampleSegHitsRect(x1, y1, x2, y2, r, trim = 14) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len <= trim * 2) return false;
      const steps = 28;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const dist = len * t;
        if (dist < trim || dist > len - trim) continue;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        if (pointInRect(x, y, r)) return true;
      }
      return false;
    }

    function parsePathSegments(d) {
      const segs = [];
      const tokens = d.trim().split(/(?=[ML])/);
      let cx = 0;
      let cy = 0;
      for (const tok of tokens) {
        const nums = tok.slice(1).trim().split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n));
        if (tok[0] === 'M' && nums.length >= 2) {
          cx = nums[0];
          cy = nums[1];
        } else if (tok[0] === 'L' && nums.length >= 2) {
          segs.push({ x1: cx, y1: cy, x2: nums[0], y2: nums[1] });
          cx = nums[0];
          cy = nums[1];
        }
      }
      return segs;
    }

    for (const pathEl of doc.querySelectorAll('#links path')) {
      const d = pathEl.getAttribute('d');
      if (!d) continue;
      for (const seg of parsePathSegments(d)) {
        for (const tr of textRects) {
          if (sampleSegHitsRect(seg.x1, seg.y1, seg.x2, seg.y2, tr)) {
            out.push({ slide: 11, reason: 'wire-crosses-text', d: d.slice(0, 40) });
            break;
          }
        }
      }
    }

    const host = doc.getElementById('n-volaris');
    if (host && host.dataset.tip) {
      host.dispatchEvent(new Event('mouseenter'));
      const tip = doc.getElementById('tip');
      if (tip && tip.classList.contains('show')) {
        const tr = tip.getBoundingClientRect();
        const vw = win.innerWidth;
        const vh = win.innerHeight;
        if (tr.top < 4 || tr.left < 4 || tr.bottom > vh - 4 || tr.right > vw - 4) {
          out.push({ slide: 11, reason: 'tooltip-outside-iframe-viewport' });
        }
      }
      host.dispatchEvent(new Event('mouseleave'));
    }

    const stage = document.querySelector('.decision-slide .dos-stage');
    const stageRect = stage?.getBoundingClientRect();
    const hostRect = document.getElementById('decisionScaleHost')?.getBoundingClientRect();
    if (stageRect && hostRect && hostRect.bottom > stageRect.bottom + 2) {
      out.push({ slide: 11, reason: 'diagram-host-clipped-by-stage' });
    }

    const navTop = document.querySelector('.nav')?.getBoundingClientRect().top;
    const clearance = navClearance;
    if (navTop != null && hostRect && hostRect.bottom > navTop - clearance) {
      out.push({
        slide: 11,
        reason: 'diagram-over-nav-pill',
        bottom: Math.round(hostRect.bottom),
        navTop: Math.round(navTop),
        gap: Math.round(navTop - hostRect.bottom),
      });
    }

    const sig = doc.getElementById('n-signal');
    if (sig && navTop != null) {
      const sigRect = sig.getBoundingClientRect();
      if (sigRect.bottom > navTop - clearance) {
        out.push({
          slide: 11,
          reason: 'signal-over-nav-pill',
          bottom: Math.round(sigRect.bottom),
          navTop: Math.round(navTop),
          gap: Math.round(navTop - sigRect.bottom),
        });
      }
    }

    return out;
  }, { gap: DECISION_NODE_GAP_PX, pad: 2, navClearance: DECISION_NAV_CLEARANCE_PX });

  const pass = failures.length === 0;
  console.log(`  slide 11 decision diagram @ ${label}: ${pass ? 'PASS' : 'FAIL'} (${failures.length})`);
  if (!pass) {
    for (const f of failures.slice(0, 10)) console.log('   ', JSON.stringify(f));
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
    const isDiagram = i === DOS_SLIDE_INDEX || i === DECISION_SLIDE_INDEX;
    await page.waitForTimeout(isDiagram ? 1200 : 300);
    const pass = await checkSlide(page, i, label);
    if (!pass) allPass = false;
    if (i === MATRIX_SLIDE_INDEX) {
      const matrixPass = await checkMatrixCards(page, i, label);
      if (!matrixPass) allPass = false;
    }
    if (i === DECISION_SLIDE_INDEX) {
      const decisionPass = await checkDecisionDiagram(page, i, label);
      if (!decisionPass) allPass = false;
    }
  }
  const titlesPass = await checkContentSlideTitleTypography(page, label);
  if (!titlesPass) allPass = false;

  await context.close();
}

await browser.close();
server.close();

console.log(`\nOverall: ${allPass ? 'PASS' : 'FAIL'}`);
process.exit(allPass ? 0 : 1);
