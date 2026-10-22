/* Live diagrams inside slides 3 and 8.
   Each slide hosts its diagram page in an iframe (?embed=1): wide layout on wide screens with a fine pointer,
   vertical layout below 1100 px or on touch; switches on resize without reloading the deck.
   The page sends its height, forwards slide keys so it never traps navigation, and on phones asks the deck
   to reveal the detail panel without pushing the tapped node out of view. */
(function(){
  var figs=[].slice.call(document.querySelectorAll('.p2-diagram.live'));
  if(!figs.length)return;
  var coarse=matchMedia('(pointer: coarse)');
  function variant(){return (innerWidth<1100||coarse.matches)?'m':'d'}
  function frameOf(f){return f.querySelector('iframe')}
  function size(f){
    var fr=frameOf(f),slide=f.closest('.slide');
    if(f._h)fr.style.height=f._h+'px';
    fr.classList.toggle('scrolls',innerWidth>640&&f._h&&fr.getBoundingClientRect().height<f._h-1);
    slide.dataset.dg=f._v;
  }
  function apply(){
    var v=variant();
    figs.forEach(function(f){
      var slide=f.closest('.slide');
      slide.classList.toggle('dg-m',v==='m'&&innerWidth>640);
      if(f._v!==v){f._v=v;f._h=0;var fr=frameOf(f);fr.style.height='';
        fr.src='diagrama-'+f.dataset.d+(v==='m'?'-movil':'')+'.html?embed=1';}
      size(f);
    });
  }
  function scroller(el){for(var a=el.parentElement;a&&a!==document.body;a=a.parentElement){var c=getComputedStyle(a);if(/(auto|scroll)/.test(c.overflowY)&&a.scrollHeight>a.clientHeight+1)return a}return document.scrollingElement}
  addEventListener('message',function(e){
    var d=e.data;if(!d||typeof d!=='object'||d.src!=='hid-diagram')return;
    var f=figs.filter(function(x){return frameOf(x).contentWindow===e.source})[0];if(!f)return;
    if(d.type==='size'&&d.h>0){f._h=d.h;size(f);}
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
  var t;addEventListener('resize',function(){clearTimeout(t);t=setTimeout(apply,120)});
  if(coarse.addEventListener)coarse.addEventListener('change',apply);
  apply();
})();
