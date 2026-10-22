/* Live diagrams inside slides 3 and 8.
   Each slide hosts its diagram page in an iframe (?embed=1): wide layout on wide screens with a fine pointer,
   vertical layout below 1100 px or on touch; switches on resize without reloading the deck.
   The page sends its height, forwards slide keys so it never traps navigation, and on phones asks the deck
   to reveal the detail panel without pushing the tapped node out of view. When the detail would not fit under
   the diagram (vertical layout beside the title, or a short wide screen), the deck shows it in the slide's
   text column instead, so it never covers a node. */
(function(){
  var figs=[].slice.call(document.querySelectorAll('.p2-diagram.live'));
  if(!figs.length)return;
  var coarse=matchMedia('(pointer: coarse)');
  function variant(){return (innerWidth<1100||coarse.matches)?'m':'d'}
  function frameOf(f){return f.querySelector('iframe')}
  function panel(f){
    if(f._p)return f._p;
    var head=f.closest('.slide').querySelector('.slide-head'),p=document.createElement('div');
    p.className='hid-dg-panel';p.setAttribute('aria-live','polite');p.innerHTML='<p class="hid-dg-hint"></p><p class="hid-dg-det"></p>';
    head.appendChild(p);f._p=p;return p;
  }
  /* the panel keeps the height of its longest text, so it never grows or jumps on hover/tap */
  function reserve(p){
    if(!p||!p._all||!p.offsetWidth||p._w===p.offsetWidth)return;
    var q=p.querySelector('.hid-dg-det'),cur=q.innerHTML,m=0;p.style.minHeight='';
    p._all.forEach(function(h){q.innerHTML=h;m=Math.max(m,p.offsetHeight)});q.innerHTML=cur;p.style.minHeight=m+'px';p._w=p.offsetWidth;
  }
  function avail(fr){var o=fr.style.height;fr.style.height='100000px';var a=fr.getBoundingClientRect().height;fr.style.height=o;return a}
  function size(f){
    var fr=frameOf(f),slide=f.closest('.slide');
    if(f._h){
      var av=avail(fr);
      if(!av){fr.style.height=f._h+'px';return;}  /* slide not shown yet: decide when it becomes active */
      var ext=innerWidth>640&&(f._v==='m'||av<f._h-1);
      if(ext!==f._ext){f._ext=ext;slide.classList.toggle('dg-ext',ext);panel(f);
        try{fr.contentWindow.postMessage({src:'hid-deck',type:'ext',on:ext},'*')}catch(e){}}
      fr.style.height=((ext&&f._hx)?f._hx:f._h)+'px';
    }
    fr.classList.toggle('scrolls',innerWidth>640&&f._h&&fr.getBoundingClientRect().height<f._h-1);
    slide.dataset.dg=f._v;
  }
  function apply(){
    var v=variant();
    figs.forEach(function(f){
      var slide=f.closest('.slide');
      slide.classList.toggle('dg-m',v==='m'&&innerWidth>640);
      if(f._v!==v){f._v=v;f._h=0;f._ext=null;slide.classList.remove('dg-ext');var fr=frameOf(f);fr.style.height='';
        fr.src='diagrama-'+f.dataset.d+(v==='m'?'-movil':'')+'.html?embed=1';}
      size(f);
    });
  }
  function scroller(el){for(var a=el.parentElement;a&&a!==document.body;a=a.parentElement){var c=getComputedStyle(a);if(/(auto|scroll)/.test(c.overflowY)&&a.scrollHeight>a.clientHeight+1)return a}return document.scrollingElement}
  addEventListener('message',function(e){
    var d=e.data;if(!d||typeof d!=='object'||d.src!=='hid-diagram')return;
    var f=figs.filter(function(x){return frameOf(x).contentWindow===e.source})[0];if(!f)return;
    if(d.type==='size'&&d.h>0){f._h=d.h;f._hx=d.hx||d.h;size(f);}
    else if(d.type==='details'&&Array.isArray(d.all)){
      var p=panel(f);p._all=d.all;p._w=0;p.querySelector('.hid-dg-hint').textContent=d.sub||'';reserve(p);}
    else if(d.type==='detail'&&typeof d.html==='string'){
      var pp=panel(f);pp.querySelector('.hid-dg-det').innerHTML=d.html;if(d.sub)pp.querySelector('.hid-dg-hint').textContent=d.sub;reserve(pp);}
    else if(d.type==='key'&&/^(ArrowRight|ArrowLeft|PageUp|PageDown|Home|End)$/.test(d.key)){
      document.dispatchEvent(new KeyboardEvent('keydown',{key:d.key,bubbles:true}));}
    else if(d.type==='swipe'&&window.ApplaudoDeck&&!document.documentElement.classList.contains('lb-open')){
      ApplaudoDeck.goTo(ApplaudoDeck.getCurrent()+(d.dir>0?1:-1));}
    else if(d.type==='reveal'&&innerWidth<=640){
      var r=frameOf(f).getBoundingClientRect(),bottom=r.top+d.bottom,lim=innerHeight-96;
      if(bottom>lim){
        var need=bottom-lim+8,nodeTop=r.top+(d.nodeTop||0),room=Math.max(0,nodeTop-12);
        scroller(f).scrollBy({top:Math.min(need,room),behavior:'smooth'});
      }
    }
  });
  var t;addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){apply();figs.forEach(function(f){if(f._p){f._p._w=0;reserve(f._p)}})},120)});
  addEventListener('hashchange',function(){setTimeout(function(){figs.forEach(function(f){reserve(f._p)})},60)});
  document.addEventListener('click',function(){figs.forEach(function(f){reserve(f._p)})},true);
  if(coarse.addEventListener)coarse.addEventListener('change',apply);
  apply();
  if(window.MutationObserver)figs.forEach(function(f){var sl=f.closest('.slide');
    new MutationObserver(function(){if(sl.classList.contains('active'))setTimeout(function(){size(f);reserve(f._p)},30)}).observe(sl,{attributes:true,attributeFilter:['class']});});
})();
