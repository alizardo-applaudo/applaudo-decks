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
const NAV_CLEARANCE_PX = 24;
const PROCESS_SLIDE_INDEX = 6;

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
  const failures = await page.evaluate(({ slideIndex: idx, navClearance }) => {
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
    const slideStyle = getComputedStyle(slide);
    const slideScrollable =
      slideStyle.overflowY === 'auto' ||
      slideStyle.overflowY === 'scroll' ||
      slideStyle.overflow === 'auto' ||
      slideStyle.overflow === 'scroll';

    const out = [];
    for (const scope of scopes) {
      scope.querySelectorAll('*').forEach((el) => {
        if (!isTextElement(el)) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        const ancestor = nearestOverflowHidden(el);
        if (ancestor && !slideScrollable) {
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

        if (!slideScrollable && rect.bottom > navTop - navClearance) {
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
  }, { slideIndex, navClearance: NAV_CLEARANCE_PX });

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
      if (slide.classList.contains('dos-slide') && !slide.classList.contains('decision-slide')) continue;
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

const ENFORCE_VIEWPORTS = new Set(['390x844', '360x780', '1024x500', '1366x768', '1440x900']);

async function checkLogoEyebrowClearance(page, slideIndex, label) {
  if (label !== '390x844' && label !== '360x780') return true;

  const failure = await page.evaluate(({ idx, gap }) => {
    const slide = document.querySelectorAll('#deck > .slide')[idx];
    if (!slide?.classList.contains('active')) return null;
    const logo = slide.querySelector('.logo-sm');
    const eyebrow =
      slide.querySelector('.slide-head .eyebrow') ||
      slide.querySelector('.dos-header .eyebrow') ||
      slide.querySelector('.inner > .eyebrow');
    if (!logo || !eyebrow) return null;
    const lr = logo.getBoundingClientRect();
    const er = eyebrow.getBoundingClientRect();
    if (lr.height === 0 || er.height === 0) return null;
    if (er.top < lr.bottom + gap) {
      return {
        slide: idx + 1,
        reason: 'eyebrow-overlaps-logo',
        logoBottom: Math.round(lr.bottom),
        eyebrowTop: Math.round(er.top),
        text: (eyebrow.textContent || '').trim().slice(0, 40),
      };
    }
    return null;
  }, { idx: slideIndex, gap: 6 });

  if (failure) {
    console.log(`  slide ${slideIndex + 1} logo vs eyebrow @ ${label}: FAIL`);
    console.log('   ', JSON.stringify(failure));
    return false;
  }
  return true;
}

async function checkDiagramMinFont(page, slideNum, frameId, label, minPx = 11) {
  if (!ENFORCE_VIEWPORTS.has(label)) return true;

  const wrapId = frameId === 'dosFrame' ? 'dosScaleWrap' : 'decisionScaleWrap';

  const failures = await page.evaluate(
    ({ slideNum, frameId, wrapId, minPx }) => {
      const fr = document.getElementById(frameId);
      const doc = fr?.contentDocument;
      if (!doc) return [{ slide: slideNum, reason: 'iframe-missing', frameId }];

      const wrap = document.getElementById(wrapId);
      const scale = (() => {
        const t = wrap ? getComputedStyle(wrap).transform : 'none';
        if (!t || t === 'none') return 1;
        if (t.startsWith('matrix3d(')) {
          const parts = t
            .slice(9, -1)
            .split(',')
            .map((n) => Number.parseFloat(n.trim()));
          return parts[0] || 1;
        }
        if (t.startsWith('matrix(')) {
          const parts = t
            .slice(7, -1)
            .split(',')
            .map((n) => Number.parseFloat(n.trim()));
          return parts[0] || 1;
        }
        return 1;
      })();

      const selectors =
        frameId === 'dosFrame'
          ? '.box,.stack .seg .t,.stack .seg .s,.cap,.footnote,.frame-label,.osbar,.skills .box,.feeds'
          : '.box,.box .method-title,.method-cap,.method-sublabel,.team-header,.stack .seg .t,.signal,.signal .lab';

      const out = [];
      doc.querySelectorAll(selectors).forEach((el) => {
        const text = (el.textContent || '').trim();
        if (!text) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        const effective = fs * scale;
        if (!Number.isFinite(effective) || effective + 0.05 < minPx) {
          out.push({
            slide: slideNum,
            reason: 'diagram-font-too-small',
            fontSize: fs,
            scale,
            effectivePx: effective,
            minPx,
            text: text.slice(0, 48),
          });
        }
      });
      return out;
    },
    { slideNum, frameId, wrapId, minPx },
  );

  const pass = failures.length === 0;
  console.log(`  slide ${slideNum} diagram min font @ ${label}: ${pass ? 'PASS' : 'FAIL'} (${failures.length})`);
  if (!pass) {
    for (const f of failures.slice(0, 8)) console.log('   ', JSON.stringify(f));
  }
  return pass;
}

async function checkSlideResponsive(page, slideIndex, label, minPx = 11) {
  if (!ENFORCE_VIEWPORTS.has(label)) return true;

  const failures = await page.evaluate(
    ({ idx, minPx, navClearance }) => {
      function transformScale(el, stopAt) {
        let s = 1;
        let n = el;
        while (n && n !== stopAt && n !== document.body) {
          const t = getComputedStyle(n).transform;
          if (t && t !== 'none' && t.startsWith('matrix(')) {
            s *= Math.abs(Number.parseFloat(t.slice(7).split(',')[0]) || 1);
          }
          n = n.parentElement;
        }
        return s;
      }

      function isLeafText(el) {
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
        if (el.closest('.foot')) return false;
        const text = el.textContent?.trim() ?? '';
        if (!text) return false;
        for (const child of el.children) {
          if (child.textContent?.trim()) return false;
        }
        return true;
      }

      function visibleTailBottom(el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const afterStyle = getComputedStyle(el, '::after');
        const afterH = Number.parseFloat(afterStyle.height) || 0;
        if (afterH > 0 && afterStyle.content && afterStyle.content !== 'none') {
          return rect.bottom - afterH;
        }
        return rect.bottom;
      }

      const slide = document.querySelectorAll('#deck > .slide')[idx];
      if (!slide?.classList.contains('active')) return [{ slide: idx + 1, reason: 'slide-not-active' }];

      slide.scrollTop = 0;

      const out = [];
      const vw = window.innerWidth;

      function rectsOverlap(a, b, gap = 2) {
        return !(
          a.right + gap <= b.left ||
          b.right + gap <= a.left ||
          a.bottom + gap <= b.top ||
          b.bottom + gap <= a.top
        );
      }

      const titleEl = slide.querySelector('.slide-head') || slide.querySelector('.dos-header');
      const titleRect = titleEl?.getBoundingClientRect();
      if (titleRect && titleRect.height > 0) {
        const cardSelector =
          '.problema-card,.matrix-case,.card-soft-pink,.card-soft-green,.section-card,.hero-band,.probamos-tbl tbody tr,.metrics-tbl tbody tr,.roadmap-adopcion-cards > *,.compact-steps .step-card,.curva-col,.deliverable-panel,.contract-panel,.analogy .card';
        slide.querySelectorAll(cardSelector).forEach((card) => {
          const cr = card.getBoundingClientRect();
          if (cr.width === 0 && cr.height === 0) return;
          const verticalOverlap = cr.top < titleRect.bottom - 4;
          const horizontalOverlap = !(cr.right <= titleRect.left + 2 || cr.left >= titleRect.right - 2);
          if (verticalOverlap && horizontalOverlap) {
            out.push({
              slide: idx + 1,
              reason: 'title-overlaps-card',
              card: card.className?.toString?.().slice(0, 60) || card.tagName,
              cardTop: Math.round(cr.top),
              titleBottom: Math.round(titleRect.bottom),
            });
          }
        });
      }

      if (document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1) {
        out.push({
          slide: idx + 1,
          reason: 'horizontal-document-scroll',
          sw: document.documentElement.scrollWidth,
          vw,
        });
      }
      if (slide.scrollWidth > slide.clientWidth + 1) {
        out.push({
          slide: idx + 1,
          reason: 'horizontal-slide-scroll',
          sw: slide.scrollWidth,
          cw: slide.clientWidth,
        });
      }

      const navTop = document.querySelector('.nav')?.getBoundingClientRect().top;
      const slideStyle = getComputedStyle(slide);
      const slideScrollable =
        slideStyle.overflowY === 'auto' ||
        slideStyle.overflowY === 'scroll' ||
        slide.classList.contains('dos-mobile-stack');

      const needsScrollClearance =
        slideScrollable || slide.scrollHeight > slide.clientHeight + 2;
      if (navTop != null && needsScrollClearance) {
        const tail =
          slide.querySelector('.dos-credit') ||
          slide.querySelector('.inner') ||
          slide.querySelector('.dos-stage') ||
          slide;
        const prevScroll = slide.scrollTop;
        slide.scrollTop = Math.max(0, slide.scrollHeight - slide.clientHeight);
        const tailBottom = visibleTailBottom(tail);
        if (tailBottom != null && tailBottom > navTop - navClearance) {
          out.push({
            slide: idx + 1,
            reason: 'content-under-nav-at-max-scroll',
            bottom: Math.round(tailBottom),
            navTop: Math.round(navTop),
          });
        }
        slide.scrollTop = prevScroll;
      }

      slide.querySelectorAll('*').forEach((el) => {
        if (!isLeafText(el)) return;
        if (el.closest('#dosFrame, #decisionFrame, .matrix-axis-y, .matrix-axis-x')) return;
        const fs = Number.parseFloat(getComputedStyle(el).fontSize);
        const effective = fs * transformScale(el, slide);
        if (Number.isFinite(effective) && effective + 0.15 < minPx) {
          out.push({
            slide: idx + 1,
            reason: 'text-too-small-effective',
            effectivePx: Math.round(effective * 10) / 10,
            minPx,
            text: (el.textContent || '').trim().slice(0, 48),
          });
        }
      });

      if (vw <= 640) {
        const probamos = slide.querySelector('.probamos-tbl table');
        const metrics = slide.querySelector('.metrics-tbl table');
        for (const table of [probamos, metrics].filter(Boolean)) {
          const theadDisplay = getComputedStyle(table.querySelector('thead')).display;
          const firstTr = getComputedStyle(table.querySelector('tbody tr'));
          if (theadDisplay !== 'none' || firstTr.display !== 'block') {
            out.push({ slide: idx + 1, reason: 'table-not-stacked-cards', class: table.parentElement?.className });
          }
        }

        const matrixBoard = slide.querySelector('.matrix-board');
        if (matrixBoard) {
          const boardStyle = getComputedStyle(matrixBoard);
          if (boardStyle.display !== 'flex' || boardStyle.flexDirection !== 'column') {
            out.push({ slide: idx + 1, reason: 'matrix-not-stacked' });
          }
        }

        const codePre = slide.querySelector('.codebox pre, .codebox-contract pre');
        if (codePre) {
          const preStyle = getComputedStyle(codePre);
          const box = codePre.closest('.codebox, .codebox-contract');
          const boxStyle = box ? getComputedStyle(box) : null;
          const preW = codePre.scrollWidth;
          const boxW = box?.clientWidth ?? 0;
          if (preW > boxW + 2 && (!boxStyle || boxStyle.overflowX === 'visible')) {
            out.push({ slide: idx + 1, reason: 'codebox-missing-horizontal-scroll' });
          }
        }

        for (const grid of slide.querySelectorAll('.deuda-cards, .curva-columns, .deliverable-volaris')) {
          const cols = getComputedStyle(grid).gridTemplateColumns;
          if (cols && cols !== 'none' && !cols.startsWith('1fr')) {
            const parts = cols.split(' ').filter(Boolean);
            if (parts.length > 1) {
              out.push({
                slide: idx + 1,
                reason: 'cards-not-single-column',
                class: grid.className?.toString?.().slice(0, 60),
                cols,
              });
            }
          }
        }

        for (const tbl of slide.querySelectorAll('.probamos-tbl, .metrics-tbl')) {
          tbl.querySelectorAll('tbody tr').forEach((tr, rowIdx) => {
            tr.querySelectorAll('td').forEach((td, colIdx) => {
              if (colIdx === 0) return;
              const beforeStyle = getComputedStyle(td, '::before');
              const label = beforeStyle.content?.replace(/^["']|["']$/g, '') ?? '';
              if (beforeStyle.display !== 'block' || !label || label === 'none') {
                out.push({
                  slide: idx + 1,
                  reason: 'table-field-label-not-on-own-line',
                  row: rowIdx + 1,
                  col: colIdx + 1,
                  display: beforeStyle.display,
                });
                return;
              }
              const value = (td.textContent || '').trim();
              if (value && label && !/\s/.test(value.slice(0, label.length + 1)) && value.startsWith(label)) {
                out.push({
                  slide: idx + 1,
                  reason: 'table-label-value-concatenated',
                  row: rowIdx + 1,
                  col: colIdx + 1,
                  label,
                  value: value.slice(0, 48),
                });
              }
            });
          });
        }
      }

      if (vw <= 1024 && window.innerHeight <= 620) {
        for (const grid of slide.querySelectorAll('.deuda-cards, .curva-columns')) {
          const cols = getComputedStyle(grid).gridTemplateColumns;
          if (cols && cols !== 'none') {
            const parts = cols.split(' ').filter(Boolean);
            if (parts.length > 1) {
              out.push({
                slide: idx + 1,
                reason: 'cards-not-single-column-short',
                class: grid.className?.toString?.().slice(0, 60),
                cols,
              });
            }
          }
        }
      }

      return out;
    },
    { idx: slideIndex, minPx, navClearance: NAV_CLEARANCE_PX },
  );

  const pass = failures.length === 0;
  console.log(`  slide ${slideIndex + 1} responsive @ ${label}: ${pass ? 'PASS' : 'FAIL'} (${failures.length})`);
  if (!pass) {
    for (const f of failures.slice(0, 10)) console.log('   ', JSON.stringify(f));
  }
  return pass;
}

async function checkEmbeddedIframe(page, slideNum, frameId, hostId, label) {
  const failures = await page.evaluate(
    ({ slideNum, frameId, hostId, navClearance }) => {
      const out = [];
      const fr = document.getElementById(frameId);
      const doc = fr?.contentDocument;
      if (!doc) return [{ slide: slideNum, reason: 'iframe-missing', frameId }];

      const de = doc.documentElement;
      const body = doc.body;
      const narrowEmbed = doc.documentElement.classList.contains('is-mobile-narrow');
      const tol = narrowEmbed ? 10 : 3;
      if (de.scrollHeight > de.clientHeight + tol || de.scrollWidth > de.clientWidth + tol) {
        out.push({
          slide: slideNum,
          reason: 'iframe-document-scrollbar',
          sh: de.scrollHeight,
          ch: de.clientHeight,
          sw: de.scrollWidth,
          cw: de.clientWidth,
        });
      }
      if (
        !narrowEmbed &&
        body &&
        (body.scrollHeight > body.clientHeight + tol || body.scrollWidth > body.clientWidth + tol)
      ) {
        out.push({ slide: slideNum, reason: 'iframe-body-scrollbar' });
      }

      const slide = document.querySelector('.dos-slide.active');
      const mobileStack = slide?.classList.contains('dos-mobile-stack');
      const slideScrollable =
        mobileStack ||
        (slide &&
          (getComputedStyle(slide).overflowY === 'auto' || getComputedStyle(slide).overflowY === 'scroll'));

      const navTop = document.querySelector('.nav')?.getBoundingClientRect().top;
      const hostRect = document.getElementById(hostId)?.getBoundingClientRect();
      const header = document.querySelector('.dos-slide.active .dos-header');
      if (header && navTop != null && header.getBoundingClientRect().bottom > navTop - navClearance) {
        out.push({
          slide: slideNum,
          reason: 'dos-header-over-nav',
          bottom: Math.round(header.getBoundingClientRect().bottom),
          navTop: Math.round(navTop),
        });
      }

      const useMaxScrollNavCheck =
        mobileStack || window.innerWidth <= 640 || window.matchMedia('(max-width:600px)').matches;

      function visibleTailBottom(el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const afterStyle = getComputedStyle(el, '::after');
        const afterH = parseFloat(afterStyle.height) || 0;
        if (afterH > 0 && afterStyle.content && afterStyle.content !== 'none') {
          return rect.bottom - afterH;
        }
        return rect.bottom;
      }

      if (useMaxScrollNavCheck && slideScrollable && slide && navTop != null) {
        const prevScroll = slide.scrollTop;
        slide.scrollTop = Math.max(0, slide.scrollHeight - slide.clientHeight);
        const tail =
          slide.querySelector('.dos-credit') ||
          slide.querySelector('.dos-stage') ||
          document.getElementById(hostId);
        const tailBottom = visibleTailBottom(tail);
        if (tailBottom != null && tailBottom > navTop - navClearance) {
          out.push({
            slide: slideNum,
            reason: 'diagram-tail-under-nav-at-max-scroll',
            bottom: Math.round(tailBottom),
            navTop: Math.round(navTop),
          });
        }
        slide.scrollTop = prevScroll;
      } else if (hostRect && navTop != null && hostRect.bottom > navTop - navClearance) {
        out.push({
          slide: slideNum,
          reason: 'diagram-host-over-nav',
          bottom: Math.round(hostRect.bottom),
          navTop: Math.round(navTop),
        });
      }

      const stage = document.querySelector('.dos-slide.active .dos-stage');
      const stageRect = stage?.getBoundingClientRect();
      if (!slideScrollable && stageRect && hostRect && hostRect.bottom > stageRect.bottom + 2) {
        out.push({ slide: slideNum, reason: 'diagram-host-clipped-by-stage' });
      }
      return out;
    },
    { slideNum, frameId, hostId, navClearance: NAV_CLEARANCE_PX },
  );

  const pass = failures.length === 0;
  console.log(`  slide ${slideNum} embedded diagram @ ${label}: ${pass ? 'PASS' : 'FAIL'} (${failures.length})`);
  if (!pass) {
    for (const f of failures.slice(0, 8)) console.log('   ', JSON.stringify(f));
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

    const mobileLayout =
      doc.documentElement.classList.contains('is-mobile-narrow') ||
      doc.documentElement.classList.contains('is-mobile-layout');

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

    if (!mobileLayout) {
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
    }

    const slide = document.querySelector('.decision-slide.active');
    const mobileStack = slide?.classList.contains('dos-mobile-stack') || mobileLayout;
    const slideScrollable =
      mobileStack ||
      (slide &&
        (getComputedStyle(slide).overflowY === 'auto' || getComputedStyle(slide).overflowY === 'scroll'));

    function visibleTailBottom(el) {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const afterStyle = getComputedStyle(el, '::after');
      const afterH = parseFloat(afterStyle.height) || 0;
      if (afterH > 0 && afterStyle.content && afterStyle.content !== 'none') {
        return rect.bottom - afterH;
      }
      return rect.bottom;
    }

    const stage = document.querySelector('.decision-slide .dos-stage');
    const stageRect = stage?.getBoundingClientRect();
    const hostRect = document.getElementById('decisionScaleHost')?.getBoundingClientRect();
    if (!mobileStack && stageRect && hostRect && hostRect.bottom > stageRect.bottom + 2) {
      out.push({ slide: 11, reason: 'diagram-host-clipped-by-stage' });
    }

    const navTop = document.querySelector('.nav')?.getBoundingClientRect().top;
    const clearance = navClearance;
    const useMaxScrollNavCheck =
      mobileStack || window.innerWidth <= 640 || window.matchMedia('(max-width:600px)').matches;

    if (useMaxScrollNavCheck && slideScrollable && slide && navTop != null) {
      const prevScroll = slide.scrollTop;
      slide.scrollTop = Math.max(0, slide.scrollHeight - slide.clientHeight);
      const tail = slide.querySelector('.dos-stage') || document.getElementById('decisionScaleHost');
      const tailBottom = visibleTailBottom(tail);
      if (tailBottom != null && tailBottom > navTop - clearance) {
        out.push({
          slide: 11,
          reason: 'diagram-tail-under-nav-at-max-scroll',
          bottom: Math.round(tailBottom),
          navTop: Math.round(navTop),
        });
      }
      slide.scrollTop = prevScroll;
    } else if (navTop != null && hostRect && hostRect.bottom > navTop - clearance) {
      out.push({
        slide: 11,
        reason: 'diagram-over-nav-pill',
        bottom: Math.round(hostRect.bottom),
        navTop: Math.round(navTop),
        gap: Math.round(navTop - hostRect.bottom),
      });
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
  { label: '1366x768', width: 1366, height: 768 },
  { label: '1024x500', width: 1024, height: 500 },
  { label: '390x844', width: 390, height: 844 },
  { label: '360x780', width: 360, height: 780 },
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
    await page.waitForTimeout(isDiagram ? (height <= 620 ? 2000 : 1500) : height < 620 ? 400 : 300);
    const pass = await checkSlide(page, i, label);
    if (!pass) allPass = false;
    const logoPass = await checkLogoEyebrowClearance(page, i, label);
    if (!logoPass) allPass = false;
    const responsivePass = await checkSlideResponsive(page, i, label);
    if (!responsivePass) allPass = false;
    if (i === MATRIX_SLIDE_INDEX) {
      const matrixPass = await checkMatrixCards(page, i, label);
      if (!matrixPass) allPass = false;
    }
    if (i === PROCESS_SLIDE_INDEX) {
      const dosPass = await checkEmbeddedIframe(page, 7, 'dosFrame', 'dosScaleHost', label);
      if (!dosPass) allPass = false;
      const dosFontPass = await checkDiagramMinFont(page, 7, 'dosFrame', label);
      if (!dosFontPass) allPass = false;
    }
    if (i === DECISION_SLIDE_INDEX) {
      const decisionPass = await checkDecisionDiagram(page, i, label);
      if (!decisionPass) allPass = false;
      const embedPass = await checkEmbeddedIframe(page, 11, 'decisionFrame', 'decisionScaleHost', label);
      if (!embedPass) allPass = false;
      const decisionFontPass = await checkDiagramMinFont(page, 11, 'decisionFrame', label);
      if (!decisionFontPass) allPass = false;
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
