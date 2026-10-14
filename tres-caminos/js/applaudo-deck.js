/* Applaudo deck engine — keyboard, pill nav, logos, optional diagram iframe */
(function (global) {
  var LOGO_L = [
    'M207.2,105.3l-6.1-15.4h-30.4l-5.8,15.4h-20.6l32.9-78.6h18.4l32.6,78.6h-21.1,0ZM186.1,47.7l-10,27h19.7l-9.8-27Z',
    'M266.7,106.9c-6.8,0-13.3-2.9-16.8-7.7h-.2v32.7h-18.2V50h17.3v6.8h.3c3.3-4.4,9.5-8.3,17.6-8.3,16.1,0,26.2,13.5,26.2,29s-9.6,29.4-26.3,29.4h0ZM262.3,63.3c-8.2,0-13.3,7.2-13.3,14.2s5.1,14.2,13.3,14.2,13-7.1,13-14.3-4.3-14.1-13-14.1h0Z',
    'M335.9,106.9c-6.8,0-13.3-2.9-16.8-7.7h-.2v32.7h-18.2V50h17.3v6.8h.3c3.3-4.4,9.5-8.3,17.6-8.3,16.1,0,26.2,13.5,26.2,29s-9.6,29.4-26.3,29.4h0ZM331.5,63.3c-8.2,0-13.3,7.2-13.3,14.2s5.1,14.2,13.3,14.2,13-7.1,13-14.3-4.3-14.1-13-14.1h0Z',
    'M370.1,105.3V21.4h18.4v83.9h-18.4Z',
    'M398.3,57.6c6.4-6.1,15.6-9.3,24.6-9.3,18.5,0,25.4,9.1,25.4,29.2v27.9h-16.6v-5.9h-.3c-2.8,4.6-9.1,7.2-15.6,7.2s-20.1-4.3-20.1-17.3,19.4-18.7,35.5-18.7v-.9c0-5.4-4.3-8-10-8s-10.3,2.6-13.6,5.7l-9.2-9.9ZM431.7,81.2h-2.3c-8,0-17,1-17,7.6s4.2,5.7,7.9,5.7c7.3,0,11.4-4.4,11.4-11.3v-1.9h0Z',
    'M494.5,105.3v-7.7h-.2c-2.5,4.9-8.9,9.2-16.6,9.2-14.9,0-20.1-11.5-20.1-22.6v-34.2h18.3v30c0,6.2,1.6,11.8,8.2,11.8s9.8-5.6,9.8-11.9v-29.9h18.2v55.3h-17.5Z',
    'M564.3,105.3v-7.2h-.2c-3.5,5.6-10.8,8.8-18.1,8.8-16.6,0-26.3-14-26.3-29.4s10-29,26.1-29,13.7,3.8,16.9,7.4h.2V21.4h18.2v83.9h-16.8ZM550.3,63.3c-8.7,0-13.1,7-13.1,14.1s4.4,14.3,13.1,14.3,13.3-7,13.3-14.2-5.1-14.2-13.3-14.2h0Z',
    'M619.3,107.1c-16.6,0-30.6-11.5-30.6-29.6s14-29.2,30.6-29.2,30.7,11.1,30.7,29.2-14,29.6-30.7,29.6ZM619.3,63.3c-8.5,0-13,7-13,14.1s4.5,14.3,13.1,14.3,13.1-7.2,13.1-14.3-4.7-14.1-13.2-14.1Z'
  ];
  var LOGO_M = [
    'M117.4,6.1c-2.4-3.4-6.3-5.6-10.4-6-.8,0-1.7.1-2.4.5L2,59.8c-1.4.8-2.2,2.4-1.9,4,.4,2.5,1.2,4.9,2.4,7,0,0,0,.1,0,.2,1.3,2.1,2.9,4.1,4.9,5.6,1.3,1,3,1.1,4.4.3L98.3,27v99.9c0,1.6,1,3.1,2.5,3.7,2.4,1,4.9,1.4,7.4,1.4s5-.5,7.4-1.4c1.5-.6,2.5-2.1,2.5-3.7V8.4c0-.8-.3-1.6-.7-2.3h0Z',
    'M73.9,57.2c-.8,0-1.7,0-2.4.5l-53.1,30.7c-1.4.8-2.2,2.4-1.9,4,.4,2.5,1.2,4.9,2.4,7,0,0,0,.1,0,.2,1.3,2.1,2.9,4.1,4.9,5.6,1.3,1,3,1.1,4.4.3l36.9-21.3v42.7c0,1.6,1,3.1,2.5,3.7,2.4,1,4.9,1.4,7.4,1.4s5-.5,7.4-1.4c1.5-.6,2.5-2.1,2.5-3.7v-61.3c0-.8-.3-1.6-.7-2.3-2.4-3.4-6.3-5.6-10.4-6Z'
  ];

  function logo(variant, width) {
    var t = variant === 'light' ? '#fff' : '#121212';
    var s =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 132" width="' +
      width +
      '" role="img" aria-label="Applaudo">';
    LOGO_L.forEach(function (d) {
      s += '<path fill="' + t + '" d="' + d + '"/>';
    });
    LOGO_M.forEach(function (d) {
      s += '<path fill="#ff4040" d="' + d + '"/>';
    });
    return s + '</svg>';
  }

  function initDeck(options) {
    options = options || {};
    var root = document.getElementById(options.deckId || 'deck');
    if (!root) return;

    document.querySelectorAll('[data-logo]').forEach(function (el) {
      var w = el.dataset.logoWidth ? +el.dataset.logoWidth : el.closest('.slide-dark') ? 146 : 120;
      el.innerHTML = logo(el.dataset.logo, w);
    });

    var slides = [].slice.call(root.querySelectorAll('.slide'));
    var N = slides.length;
    var cur = 0;
    var dots = document.getElementById('dots');
    var counter = document.getElementById('counter');
    var prog = document.getElementById('progress');
    var prev = document.getElementById('prev');
    var next = document.getElementById('next');

    if (dots) {
      slides.forEach(function (_, i) {
        var d = document.createElement('button');
        d.className = 'dot' + (i === 0 ? ' active' : '');
        d.setAttribute('aria-label', 'Ir a diapositiva ' + (i + 1));
        d.onclick = function () {
          goTo(i);
        };
        dots.appendChild(d);
      });
    }

    function isNarrowDiagramViewport(stage) {
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var stageW = stage ? stage.clientWidth : vw;
      if (vw <= 600 || stageW <= 600) return true;
      if (vh > vw && vw <= 700) return true;
      if (vh <= 620 && vw <= 1024) return true;
      return false;
    }

    function fitEmbeddedDiagram(cfg) {
      var fr = document.getElementById(cfg.frameId);
      var wrap = document.getElementById(cfg.wrapId);
      var host = document.getElementById(cfg.hostId);
      if (!fr || !wrap || !host) return;
      var slide = fr.closest('.slide');
      if (!slide || !slide.classList.contains('active')) return;
      var stage = slide.querySelector('.dos-stage');
      if (!stage) return;
      try {
        var doc = fr.contentDocument;
        var win = fr.contentWindow;
        if (!doc || !win) return;
        var marginX = cfg.marginX != null ? cfg.marginX : 48;
        var marginY = cfg.marginY != null ? cfg.marginY : 12;
        var stageStyle = window.getComputedStyle(stage);
        var padT = parseFloat(stageStyle.paddingTop) || 0;
        var padB = parseFloat(stageStyle.paddingBottom) || 0;
        var padL = parseFloat(stageStyle.paddingLeft) || 0;
        var padR = parseFloat(stageStyle.paddingRight) || 0;
        var availW = stage.clientWidth - padL - padR - marginX * 2;
        var narrow =
          (cfg.frameId === 'dosFrame' || cfg.frameId === 'decisionFrame') &&
          isNarrowDiagramViewport(stage);
        if (doc.documentElement) {
          doc.documentElement.classList.toggle('is-mobile-narrow', narrow);
        }
        if (doc.body) {
          doc.body.style.overflow = narrow ? 'hidden' : '';
        }
        fr.style.width = narrow
          ? Math.max(320, Math.floor(availW)) + 'px'
          : (cfg.measureWidth || 1500) + 'px';
        fr.style.overflow = 'hidden';
        if (cfg.relayoutFn && typeof win[cfg.relayoutFn] === 'function') win[cfg.relayoutFn]();
        win.dispatchEvent(new Event('resize'));
        var canvas = doc.getElementById('canvas');
        var contentW = cfg.defaultW || 1280;
        var contentH = cfg.defaultH || 520;
        if (canvas) {
          contentW = Math.max(canvas.scrollWidth, canvas.offsetWidth, narrow ? 0 : cfg.defaultW || 1280);
          if (!narrow) contentW += cfg.padW || 56;
          contentH = Math.max(canvas.scrollHeight, canvas.offsetHeight) + (cfg.padH || 8);
          var foot = doc.querySelector('.footnote');
          if (foot) contentH = Math.max(contentH, foot.offsetTop + foot.offsetHeight + 8);
        } else {
          contentH = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, contentH);
        }
        contentW = Math.ceil(contentW);
        contentH = Math.ceil(contentH);
        fr.style.width = contentW + 'px';
        fr.style.height = contentH + 'px';
        if (cfg.relayoutFn && typeof win[cfg.relayoutFn] === 'function') win[cfg.relayoutFn]();
        contentH = Math.max(
          contentH,
          doc.documentElement.scrollHeight,
          doc.body ? doc.body.scrollHeight : 0,
        );
        contentH = Math.ceil(contentH);
        if (narrow) contentH += 6;
        fr.style.height = contentH + 'px';
        wrap.style.width = contentW + 'px';
        wrap.style.height = contentH + 'px';

        var creditEl = slide.querySelector('.dos-credit');
        var isDecision = slide.classList.contains('decision-slide');
        var creditBand = creditEl ? creditEl.offsetHeight + 8 : 0;
        var extraBand = isDecision ? 0 : creditBand;
        var availH = stage.clientHeight - padT - padB - marginY - extraBand;
        var scale = narrow ? 1 : Math.min(availW / contentW, availH / contentH);
        var navClear = cfg.navClearance != null ? cfg.navClearance : 24;
        var navEl = document.querySelector('.nav');
        if (!narrow && navEl) {
          var navTop = navEl.getBoundingClientRect().top;
          var stageRect = stage.getBoundingClientRect();
          var maxHostBottom = navTop - navClear;
          var maxHostH = maxHostBottom - stageRect.top - padT - marginY;
          if (maxHostH > 24 && contentH > 0) {
            scale = Math.min(scale, maxHostH / contentH);
          }
        }
        if (!isFinite(scale) || scale <= 0) scale = 0.5;
        if (narrow) scale = Math.min(scale, 1);
        if (!narrow && doc) {
          var fontSel =
            cfg.frameId === 'dosFrame'
              ? '.box,.stack .seg .t,.stack .seg .s,.cap,.footnote,.frame-label,.osbar,.skills .box,.feeds'
              : '.box,.method-title,.method-cap,.method-sublabel,.team-header,.stack .seg .t,.signal,.signal .lab';
          var minFs = Infinity;
          doc.querySelectorAll(fontSel).forEach(function (el) {
            var fs = parseFloat(win.getComputedStyle(el).fontSize);
            if (fs > 0 && fs < minFs) minFs = fs;
          });
          if (isFinite(minFs) && minFs > 0 && minFs * scale < 11) {
            scale = Math.min(1, 11 / minFs);
          }
        }
        var scaledH = Math.ceil(contentH * scale);
        wrap.style.transformOrigin = 'top center';
        wrap.style.transform = narrow && scale >= 1 ? 'none' : 'scale(' + scale + ')';
        host.style.display = 'flex';
        host.style.justifyContent = 'center';
        host.style.alignItems = 'flex-start';
        host.style.overflow = narrow ? 'visible' : 'hidden';
        host.style.width = '100%';
        host.style.maxWidth = Math.max(0, stage.clientWidth - padL - padR) + 'px';
        host.style.height = scaledH + 'px';
        host.style.flex = narrow ? '0 0 auto' : '1 1 auto';
        host.style.minHeight = narrow ? '0' : '0';
        host.style.margin = '0 auto';
        slide.classList.toggle('dos-mobile-stack', narrow);
      } catch (e) {}
    }

    function scheduleDiagramFit(cfg) {
      fitEmbeddedDiagram(cfg);
      requestAnimationFrame(function () { fitEmbeddedDiagram(cfg); });
      setTimeout(function () { fitEmbeddedDiagram(cfg); }, 120);
      setTimeout(function () { fitEmbeddedDiagram(cfg); }, 450);
      setTimeout(function () { fitEmbeddedDiagram(cfg); }, 900);
    }

    var DOS_CFG = {
      frameId: 'dosFrame',
      wrapId: 'dosScaleWrap',
      hostId: 'dosScaleHost',
      relayoutFn: 'designOSRelayout',
      defaultW: 1360,
      defaultH: 520,
      marginX: 24,
      marginY: 4,
      padW: 48,
      padH: 12,
      navClearance: 24
    };
    var DECISION_CFG = {
      frameId: 'decisionFrame',
      wrapId: 'decisionScaleWrap',
      hostId: 'decisionScaleHost',
      relayoutFn: 'decisionRelayout',
      defaultW: 1180,
      defaultH: 620,
      marginX: 24,
      marginY: 2,
      padW: 32,
      padH: 12,
      navClearance: 24
    };

    function scheduleActiveDiagramFit() {
      var slide = slides[cur];
      if (!slide) return;
      if (slide.classList.contains('decision-slide')) scheduleDiagramFit(DECISION_CFG);
      else if (slide.classList.contains('dos-slide')) scheduleDiagramFit(DOS_CFG);
    }

    function goTo(n) {
      n = Math.max(0, Math.min(n, N - 1));
      slides[cur].classList.remove('active');
      if (dots && dots.children[cur]) dots.children[cur].classList.remove('active');
      cur = n;
      slides[cur].classList.add('active');
      if (dots && dots.children[cur]) dots.children[cur].classList.add('active');
      slides[cur].scrollTop = 0;
      if (counter) counter.textContent = cur + 1 + ' / ' + N;
      if (prog) prog.style.width = ((cur + 1) / N) * 100 + '%';
      if (prev) prev.disabled = cur === 0;
      if (next) next.disabled = cur === N - 1;
      try {
        history.replaceState(null, '', '#' + (cur + 1));
      } catch (e) {}
      scheduleActiveDiagramFit();
      if (options.onSlideChange) options.onSlideChange(cur, slides[cur]);
    }

    if (prev) prev.onclick = function () {
      goTo(cur - 1);
    };
    if (next) next.onclick = function () {
      goTo(cur + 1);
    };

    document.addEventListener('keydown', function (e) {
      if (e.target.isContentEditable || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goTo(cur + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(cur - 1);
      if (e.key === 'Home') goTo(0);
      if (e.key === 'End') goTo(N - 1);
    });

    if (counter) counter.textContent = '1 / ' + N;
    if (prog) prog.style.width = (1 / N) * 100 + '%';
    if (prev) prev.disabled = true;

    var h = parseInt((location.hash || '').slice(1), 10);
    if (h > 1 && h <= N) goTo(h - 1);

    function bindFrameKeys(fr) {
      try {
        fr.contentWindow.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight' || e.key === 'PageDown') goTo(cur + 1);
          if (e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(cur - 1);
        });
      } catch (x) {}
    }

    ['dosFrame', 'decisionFrame'].forEach(function (id) {
      var fr = document.getElementById(id);
      if (!fr) return;
      fr.addEventListener('load', function () {
        bindFrameKeys(fr);
        scheduleActiveDiagramFit();
      });
      bindFrameKeys(fr);
    });

    window.addEventListener('resize', function () {
      scheduleActiveDiagramFit();
    });

    global.ApplaudoDeck = { goTo: goTo, getCurrent: function () { return cur; } };
    return goTo;
  }

  global.ApplaudoDeckInit = initDeck;
  global.ApplaudoLogo = logo;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (document.body.dataset.autoDeck !== 'false') initDeck();
    });
  } else if (document.body.dataset.autoDeck !== 'false') {
    initDeck();
  }
})(window);
