/* Galería Figma vs corrida 2 — deck Volaris contratos r2 */
(function(){
  var G=[
    ['01','Tarjeta Flex sin elegir','Íconos reales y textos correctos, sin borde de color.',0],
    ['02','Tarjeta Flex · personalizar (0 de 2)','Cajas, espacios y precio dentro de la tarjeta, como en Figma. La pantalla de prueba es más ancha.',0],
    ['03','Tarjeta Flex · 1 de 2','La opción elegida lleva el fondo rosa.',0],
    ['04','Tarjeta Flex · 2 de 2','El check sale negro junto a la flecha, no verde junto al título.',1],
    ['05','Tarjeta Flex · editando','El lápiz queda a la izquierda de «Continuar».',0],
    ['06','Selector · 0 de 2','«1 maleta documentada de 15 kg» cabe en una línea porque la pantalla de prueba es más ancha.',1],
    ['07','Selector · 1 de 2','Ya aparecen las descripciones de cada opción.',0],
    ['08','Selector · 2 de 2','Bloques cerrados con la opción elegida resaltada. El check sigue negro.',1],
    ['09','Selector · editando','El check sale negro en vez de verde.',1],
    ['10','De Zero a Flex · selector a medias','«Confirmar» como en Figma. Figma muestra 5 beneficios; acordamos 4.',0],
    ['11','Éxito','Fondo verde, ícono de celebración y «Por pasajero».',0],
    ['12','Éxito · de Zero a Flex','El texto de éxito es el de Figma.',0],
    ['13','Comparación de Zero a Flex','La fila de check-in no coincide, los textos se cortan, la ✕ sale negra y el precio trae asteriscos. La tabla no estaba en el contrato y se armó con datos de prueba; por eso ahora se sella celda por celda.',1],
    ['14','Mejorar a Flex · 0 de 2','La barra de arriba trae ← y el título a la izquierda; Figma usa ‹ y el título centrado.',1],
    ['15','Mejorar a Flex · 1 de 2','El selector va dentro de la tarjeta, como en Figma.',0],
    ['16','Mejorar a Flex · completo','Mensaje de éxito y precio bien; la barra de arriba sigue distinta.',1]
  ];
  function init(root){
    var i=0,fa=root.querySelector('[data-g="fa"]'),fi=root.querySelector('[data-g="fi"]'),
        ra=root.querySelector('[data-g="ra"]'),ri=root.querySelector('[data-g="ri"]'),
        n=root.querySelector('[data-g="n"]'),t=root.querySelector('[data-g="t"]'),d=root.querySelector('[data-g="d"]'),
        chips=root.querySelector('[data-g="chips"]');
    G.forEach(function(g,k){var b=document.createElement('button');b.type='button';b.textContent=g[0];
      if(g[3])b.className='diff';b.setAttribute('aria-label','Pantalla '+g[0]+': '+g[1]+(g[3]?' (con diferencia)':''));
      b.addEventListener('click',function(e){e.stopPropagation();show(k)});chips.appendChild(b)});
    function show(k){i=(k+G.length)%G.length;var g=G[i],f='assets/galeria/g'+g[0]+'-figma.png',r='assets/galeria/g'+g[0]+'-r2.png';
      fi.src=f;fa.href=f;ri.src=r;ra.href=r;fi.alt='Figma: '+g[1];ri.alt='Corrida 2: '+g[1];
      n.textContent=g[0]+' / 16';t.textContent=g[1];d.textContent=g[2];
      [].forEach.call(chips.children,function(c,k2){c.setAttribute('aria-current',k2===i?'true':'false')});
      fit();}
    var stage=root.querySelector('[data-g="stage"]'),hint=root.querySelector('[data-g="hint"]'),
        tags=root.querySelector('[data-g="tags"]'),MIN=0.72;
    fi.addEventListener('load',function(){fit()});ri.addEventListener('load',function(){fit()});
    /* Desktop: size both images at one shared scale. Fit the stage when that keeps them >= 72% of their
       natural size; otherwise keep 72% and let the stage scroll inside (both images move together).
       The "Figma" / "Corrida 2" labels live in a row above the stage, so they never scroll away.
       Recomputed from a clean state on every pair change, resize and slide activation. */
    function fit(){
      var imgs=[fi,ri];
      hint.hidden=true;stage.classList.remove('tall');stage.scrollTop=0;
      if(innerWidth<=640||!root.closest('.slide').classList.contains('active')){imgs.forEach(function(im){im.style.width=im.style.height=''});[].forEach.call(tags.children,function(c){c.style.width=''});delete root.dataset.scale;return;}
      if(!imgs.every(function(im){return im.complete&&im.naturalWidth}))return;
      var cs=getComputedStyle(stage),gap=parseFloat(cs.columnGap)||20;
      var W=stage.clientWidth-gap-4,H=stage.clientHeight-4;
      var w=fi.naturalWidth+ri.naturalWidth,h=Math.max(fi.naturalHeight,ri.naturalHeight);
      /* wide cards (01, 11, 12) are exported at ~2x, so their text stays large at a lower scale */
      var min=fi.naturalWidth>600?0.45:MIN;
      var s=Math.min(1,W/w,Math.max(H/h,min));
      imgs.forEach(function(im,k){var iw=Math.round(im.naturalWidth*s);im.style.width=iw+'px';im.style.height=Math.round(im.naturalHeight*s)+'px';tags.children[k].style.width=(iw+2)+'px'});
      tags.style.columnGap=gap+'px';
      var tall=Math.round(h*s)>H+1;stage.classList.toggle('tall',tall);hint.hidden=!tall;stage.scrollTop=0;
      root.dataset.scale=s.toFixed(3);root.dataset.tall=tall?'1':'0';
    }
    addEventListener('resize',fit);
    new MutationObserver(function(){fit()}).observe(root.closest('.slide'),{attributes:true,attributeFilter:['class']});
    root.querySelector('[data-g="prev"]').addEventListener('click',function(e){e.stopPropagation();show(i-1)});
    root.querySelector('[data-g="next"]').addEventListener('click',function(e){e.stopPropagation();show(i+1)});
    show(0);
    window.R2Galeria={show:show};
  }
  document.querySelectorAll('.r2-gal').forEach(init);
  /* Triptych (s06): on desktop the three screens keep one shared scale of at least MIN_T of their natural
     size (exports are 2 px per dp, so MIN_T 0.46 ≈ 92% of real size). Each label + one-phrase caption sits
     above its screen and stays put; if the screens are taller than the space, each one scrolls inside its
     frame and the three move together. A thin outer margin (outside the card border) is trimmed, and on
     narrow windows the triptych uses the full slide width. Click opens the full screen. */
  document.querySelectorAll('.r2-tri').forEach(function(tri){
    var slide=tri.closest('.slide'),figs=[].slice.call(tri.querySelectorAll('figure')),
        hint=tri.parentElement.querySelector('.r2-tri-hint'),MIN_T=0.46,lock=false;
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
      var body=tri.parentElement.getBoundingClientRect(),W=body.width;
      if((W-2*gap-6)/sumW<MIN_T){var side=Math.max(16,Math.min(40,(innerWidth-sumW*MIN_T-2*gap-6)/2));
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
    views.forEach(function(v){v.addEventListener('scroll',function(){if(lock)return;lock=true;
      views.forEach(function(o){if(o!==v)o.scrollTop=v.scrollTop});requestAnimationFrame(function(){lock=false})},{passive:true})});
    imgs.forEach(function(im){im.addEventListener('load',fitT)});
    addEventListener('resize',fitT);
    new MutationObserver(fitT).observe(slide,{attributes:true,attributeFilter:['class']});
    fitT();
  });
})();
