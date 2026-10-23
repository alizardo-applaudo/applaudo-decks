/* Comparación Figma vs app (s06) — deck Volaris contratos, corridas 2 a 5.
   Mismo componente que el tríptico del deck de la corrida 2, ahora con dos pantallas (Figma y app):
   escala compartida, cada pantalla se desplaza dentro de su marco y las dos se mueven juntas; clic = imagen completa.
   data-min en .r2-tri fija la escala mínima (en escritorio) antes de dejar que el marco se desplace. */
(function(){
  /* Triptych (s06): on desktop the three screens keep one shared scale of at least MIN_T of their natural
     size (exports are 2 px per dp, so MIN_T 0.46 ≈ 92% of real size). Each label + one-phrase caption sits
     above its screen and stays put; if the screens are taller than the space, each one scrolls inside its
     frame and the three move together. A thin outer margin (outside the card border) is trimmed, and on
     narrow windows the triptych uses the full slide width. Click opens the full screen. */
  document.querySelectorAll('.r2-tri').forEach(function(tri){
    var slide=tri.closest('.slide'),figs=[].slice.call(tri.querySelectorAll('figure')),
        hint=(tri.closest('.slide-body')||tri.parentElement).querySelector('.r2-tri-hint'),MIN_T=+(tri.dataset.min||0.46),lock=false;
    var views=figs.map(function(f){return f.querySelector('.r2-tri-view')}),imgs=figs.map(function(f){return f.querySelector('img')}),
        caps=figs.map(function(f){return f.querySelector('figcaption')});
    function reset(){tri.style.width=tri.style.marginLeft=tri.style.columnGap='';figs.forEach(function(f,k){f.style.width='';caps[k].style.minHeight='';
      views[k].style.maxHeight='';views[k].style.width='';views[k].classList.remove('tall');views[k].scrollTop=0;imgs[k].style.width=imgs[k].style.marginLeft=''});
      if(hint)hint.hidden=true;delete tri.dataset.scale;}
    function fitT(){
      reset();
      if(innerWidth<=640||!slide.classList.contains('active'))return;
      if(!imgs.every(function(im){return im.complete&&im.naturalWidth}))return;
      tri.style.columnGap='';
      var gap=parseFloat(getComputedStyle(tri).columnGap)||24,crop=figs.map(function(f){return +f.dataset.c||0});
      var nw=imgs.map(function(im,k){return im.naturalWidth-2*crop[k]}),sumW=nw.reduce(function(a,b){return a+b},0),
          hmax=Math.max.apply(null,imgs.map(function(im){return im.naturalHeight}));
      var body=tri.getBoundingClientRect(),W=body.width;
      if(!tri.dataset.min&&(W-2*gap-6)/sumW<MIN_T){var side=Math.max(16,Math.min(40,(innerWidth-sumW*MIN_T-2*gap-6)/2));
        W=innerWidth-2*side;tri.style.width=W+'px';tri.style.marginLeft=(side-body.left)+'px';
        if(gap>12){gap=12;tri.style.columnGap='12px';}}
      var sW=(W-2*gap-6)/sumW,s=Math.min(1,sW);
      for(var it=0;it<3;it++){
        figs.forEach(function(f,k){f.style.width=(Math.round(nw[k]*s)+2)+'px'});
        var cap=Math.max.apply(null,caps.map(function(c){c.style.minHeight='';return c.offsetHeight}));
        caps.forEach(function(c){c.style.minHeight=cap+'px'});
        var H=tri.clientHeight-cap-8-2;
        s=Math.min(1,sW,Math.max(H/hmax,MIN_T));
      }
      figs.forEach(function(f,k){var im=imgs[k];f.style.width=(Math.round(nw[k]*s)+2)+'px';views[k].style.width=(Math.round(nw[k]*s)+2)+'px';
        im.style.width=Math.round(im.naturalWidth*s)+'px';im.style.marginLeft=(-Math.round(crop[k]*s))+'px';
        views[k].style.maxHeight=(Math.round(im.naturalHeight*s)+2)+'px'});
      var tall=Math.round(hmax*s)+2>H+1;if(hint)hint.hidden=!tall;
      views.forEach(function(v){v.classList.toggle('tall',v.scrollHeight>v.clientHeight+1)});
      tri.dataset.scale=s.toFixed(3);
    }
    /* keyboard inside a screen: PageDown/PageUp/Space/Home/End scroll that screen (both move together) instead of changing slide */
    views.forEach(function(v){v.setAttribute('tabindex','0');v.setAttribute('role','region');v.setAttribute('aria-label','Pantalla desplazable');
      v.addEventListener('keydown',function(e){if(!v.classList.contains('tall'))return;var step=v.clientHeight*0.85,k=e.key,top=null;
        if(k==='PageDown'||(k===' '&&!e.shiftKey))top=v.scrollTop+step;else if(k==='PageUp'||(k===' '&&e.shiftKey))top=v.scrollTop-step;
        else if(k==='End')top=v.scrollHeight;else if(k==='Home')top=0;else return;
        e.preventDefault();e.stopPropagation();v.scrollTo({top:top,behavior:'smooth'});})});
    views.forEach(function(v){v.addEventListener('scroll',function(){if(lock)return;lock=true;
      views.forEach(function(o){if(o!==v)o.scrollTop=v.scrollTop});requestAnimationFrame(function(){lock=false})},{passive:true})});
    imgs.forEach(function(im){im.addEventListener('load',fitT)});
    addEventListener('resize',fitT);
    new MutationObserver(fitT).observe(slide,{attributes:true,attributeFilter:['class']});
    fitT();
  });
})();
