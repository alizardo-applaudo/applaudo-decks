/* Deck helpers: screen tabs (slides 5 and 6) and in-deck image zoom. */
(function(){
  /* ---- tabs: click/tap, and ←/→/Home/End when a tab has focus; every tab is reachable with Tab ---- */
  document.querySelectorAll('[data-hid-tabs]').forEach(function(root){
    var img=root.querySelector('[data-v="img"]'),a=root.querySelector('[data-v="a"]'),cap=root.querySelector('[data-v="cap"]'),
        tabs=[].slice.call(root.querySelectorAll('[role="tab"]')),pane=root.querySelector('[role="tabpanel"]');
    /* tablist semantics: each tab controls the shared panel; the panel is labelled by the selected tab */
    tabs.forEach(function(b,i){if(!b.id)b.id=(pane?pane.id:'tabs')+'-tab'+(i+1);if(pane)b.setAttribute('aria-controls',pane.id)});
    function show(k,focus){var t=tabs[k];
      tabs.forEach(function(b,i){b.setAttribute('aria-selected',i===k?'true':'false');b.tabIndex=0});
      if(pane)pane.setAttribute('aria-labelledby',t.id);
      img.src=t.dataset.src;img.alt=t.dataset.alt;a.href=t.dataset.full;a.dataset.cap=t.dataset.alt;cap.textContent=t.dataset.cap;
      if(focus)t.focus();}
    if(pane){var k0=tabs.findIndex(function(b){return b.getAttribute('aria-selected')==='true'});pane.setAttribute('aria-labelledby',tabs[Math.max(0,k0)].id)}
    tabs.forEach(function(b,k){
      b.tabIndex=0;
      b.addEventListener('click',function(e){e.stopPropagation();show(k)});
      b.addEventListener('keydown',function(e){
        var n=tabs.length,j=null;
        if(e.key==='ArrowRight'||e.key==='ArrowDown')j=(k+1)%n;
        else if(e.key==='ArrowLeft'||e.key==='ArrowUp')j=(k-1+n)%n;
        else if(e.key==='Home')j=0;else if(e.key==='End')j=n-1;
        if(j===null)return;
        e.preventDefault();e.stopPropagation();show(j,true);
      });
    });
  });

  /* ---- zoom: opens over the deck; closes with a tap anywhere, Escape, the background or the close button ---- */
  var R=document.documentElement,last=null;
  var lb=document.createElement('div');
  lb.className='hid-lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Imagen ampliada');lb.hidden=true;
  lb.innerHTML='<button type="button" class="hid-lb-x" aria-label="Cerrar imagen ampliada">×</button>'+
    '<figure class="hid-lb-fig"><img alt=""><figcaption></figcaption></figure><p class="hid-lb-hint">Toca, haz clic o pulsa Esc para cerrar</p>';
  document.body.appendChild(lb);
  var lim=lb.querySelector('img'),lcap=lb.querySelector('figcaption'),lx=lb.querySelector('.hid-lb-x');
  function open(a){
    var im=a.querySelector('img');last=a;
    lb.classList.remove('tall');lim.onload=function(){lb.classList.toggle('tall',lim.naturalHeight/lim.naturalWidth>1.6)};lim.src=a.getAttribute('href');lim.alt=(im&&im.alt)||'';lcap.textContent=a.dataset.cap||(im&&im.alt)||'';
    lb.hidden=false;R.classList.add('lb-open');lb.scrollTop=0;lx.focus({preventScroll:true});
  }
  function close(){
    if(lb.hidden)return;lb.hidden=true;R.classList.remove('lb-open');lim.removeAttribute('src');
    if(last)try{last.focus({preventScroll:true})}catch(x){}
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[data-zoom]');
    if(!a||!lb.hidden)return;
    e.preventDefault();open(a);
  });
  /* a tap that scrolls a tall image does not close; a tap without movement does */
  var y0=null,moved=false;
  lb.addEventListener('pointerdown',function(e){y0=e.clientY;moved=false});
  lb.addEventListener('pointermove',function(e){if(y0!==null&&Math.abs(e.clientY-y0)>8)moved=true});
  lb.addEventListener('scroll',function(){moved=true},{passive:true});
  lb.addEventListener('click',function(e){if(e.target===lx||!moved)close();y0=null;moved=false});
  window.addEventListener('keydown',function(e){
    if(lb.hidden)return;
    if(e.key==='Escape'){e.preventDefault();close();}
    else if(e.key==='Tab'){e.preventDefault();lx.focus();}
    else if(/^(ArrowRight|ArrowLeft|PageUp|PageDown|Home|End| )$/.test(e.key)){e.preventDefault();}
    e.stopImmediatePropagation();
  },true);
  addEventListener('hashchange',close);
})();
