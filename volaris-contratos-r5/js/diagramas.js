/* Live diagrams inside slides 4 and 7 — deck Volaris contratos, corridas 2 a 5.
   Each slide hosts its diagram page in an iframe (?embed=1): wide layout on wide screens with a fine pointer,
   vertical layout below 1100 px or on touch; switches on resize without reloading the deck.
   The page reports its height, forwards slide keys (arrows, PageUp/Down, Home/End) so it never traps navigation,
   and asks the deck to reveal the detail panel on phones. */
(function(){
  var figs=[].slice.call(document.querySelectorAll('.p2-diagram.live'));
  if(!figs.length)return;
  var coarse=matchMedia('(pointer: coarse)');
  function variant(){return (innerWidth<1100||coarse.matches)?'m':'d'}
  function frameOf(f){return f.querySelector('iframe')}
  function size(f){
    var fr=frameOf(f),slide=f.closest('.slide');
    if(f._h)fr.style.height=f._h+'px';
    /* desktop: the frame takes at most the space left in the slide body; it scrolls inside only if needed */
    var sc=innerWidth>640&&f._h&&fr.getBoundingClientRect().height<f._h-1;
    /* the frame would scroll inside the slide: move its detail panel under the frame (always visible, no jumps) */
    if(sc&&!f._ext){f._ext=true;ext(f,true);}
    fr.classList.toggle('scrolls',innerWidth>640&&f._h&&fr.getBoundingClientRect().height<f._h-1);
    slide.dataset.dg=f._v;
  }
  function ext(f,on){var box=f.querySelector('.dg-ext');
    if(on&&!box){box=document.createElement('div');box.className='dg-ext';box.setAttribute('aria-live','polite');f.appendChild(box);}
    if(box)box.hidden=!on;
    try{frameOf(f).contentWindow.postMessage({src:'cr-deck',type:'ext',on:!!on},'*')}catch(x){}}
  function apply(){
    var v=variant();
    figs.forEach(function(f){
      var slide=f.closest('.slide');
      slide.classList.toggle('dg-m',v==='m'&&innerWidth>640);
      if(f._ext){f._ext=false;f._exh=0;ext(f,false);}
      if(f._v!==v){f._v=v;f._h=0;var fr=frameOf(f);fr.style.height='';
        fr.src='diagrama-'+f.dataset.d+(v==='m'?'-movil':'')+'.html?embed=1';}
      size(f);
    });
  }
  function scroller(el){for(var a=el.parentElement;a&&a!==document.body;a=a.parentElement){var c=getComputedStyle(a);if(/(auto|scroll)/.test(c.overflowY)&&a.scrollHeight>a.clientHeight+1)return a}return document.scrollingElement}
  addEventListener('message',function(e){
    var d=e.data;if(!d||typeof d!=='object'||d.src!=='cr-diagram')return;
    var f=figs.filter(function(x){return frameOf(x).contentWindow===e.source})[0];if(!f)return;
    if(d.type==='size'&&d.h>0){f._h=d.h;size(f);}
    else if(d.type==='key'&&/^(ArrowRight|ArrowLeft|PageUp|PageDown|Home|End)$/.test(d.key)){
      document.dispatchEvent(new KeyboardEvent('keydown',{key:d.key,bubbles:true}));}
    else if(d.type==='reveal'&&innerWidth<=640){
      var r=frameOf(f).getBoundingClientRect(),bottom=r.top+d.bottom,lim=innerHeight-96;
      if(bottom>lim){var sc=scroller(f);sc.scrollBy({top:bottom-lim+8,behavior:'smooth'});}
    }
    else if(d.type==='details'){var bz=f.querySelector('.dg-ext');if(bz&&!bz.hidden){var cur=bz.innerHTML,mx=0;bz.style.minHeight='';
      d.list.forEach(function(h){bz.innerHTML=h;mx=Math.max(mx,bz.offsetHeight)});bz.innerHTML=cur;f._exh=Math.max(f._exh||0,mx);bz.style.minHeight=f._exh+'px';size(f);}}
    else if(d.type==='detail'){var bx=f.querySelector('.dg-ext');if(bx)bx.innerHTML=d.html;bx.style.minHeight='';var hh=bx.offsetHeight;if(hh>(f._exh||0))f._exh=hh;bx.style.minHeight=f._exh+'px';}
    else if(d.type==='swipe'){document.dispatchEvent(new KeyboardEvent('keydown',{key:d.dir>0?'ArrowRight':'ArrowLeft',bubbles:true}));}
  });
  /* deselect the diagram when the user taps/clicks anywhere outside it (title, empty slide area) or leaves the slide */
  function clearAll(only){figs.forEach(function(f){if(only&&only===f)return;try{frameOf(f).contentWindow.postMessage({src:'cr-deck',type:'clear'},'*')}catch(x){}})}
  document.addEventListener('click',function(e){clearAll(null)});
  addEventListener('keydown',function(e){if(e.key==='Escape')clearAll(null)});
  figs.forEach(function(f){new MutationObserver(function(){if(!f.closest('.slide').classList.contains('active'))clearAll(null)}).observe(f.closest('.slide'),{attributes:true,attributeFilter:['class']})});
  var t;addEventListener('resize',function(){clearTimeout(t);t=setTimeout(apply,120)});
  if(coarse.addEventListener)coarse.addEventListener('change',apply);
  apply();
})();
