/* Volaris screens: three tabs over one image (Figma | MagicPath | Paper). */
(function(){
  document.querySelectorAll('[data-hid-tabs]').forEach(function(root){
    var img=root.querySelector('[data-v="img"]'),a=root.querySelector('[data-v="a"]'),cap=root.querySelector('[data-v="cap"]'),
        tabs=[].slice.call(root.querySelectorAll('[role="tab"]'));
    function show(k){var t=tabs[k];
      tabs.forEach(function(b,i){b.setAttribute('aria-selected',i===k?'true':'false');b.tabIndex=i===k?0:-1});
      img.src=t.dataset.src;img.alt=t.dataset.alt;a.href=t.dataset.full;cap.textContent=t.dataset.cap;}
    tabs.forEach(function(b,k){b.addEventListener('click',function(e){e.stopPropagation();show(k)})});
  });
})();
