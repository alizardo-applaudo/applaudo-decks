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
    ['13','Comparación Zero vs Flex','La fila de check-in no coincide, los textos se cortan, la ✕ sale negra y el precio trae asteriscos. Esta tabla no entraba en esta corrida.',1],
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
      [].forEach.call(chips.children,function(c,k2){c.setAttribute('aria-current',k2===i?'true':'false')});}
    root.querySelector('[data-g="prev"]').addEventListener('click',function(e){e.stopPropagation();show(i-1)});
    root.querySelector('[data-g="next"]').addEventListener('click',function(e){e.stopPropagation();show(i+1)});
    show(0);
    window.R2Galeria={show:show};
  }
  document.querySelectorAll('.r2-gal').forEach(init);
})();
