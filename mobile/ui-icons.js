/* Amorist mobile line-art icon system.
   Inline SVG replaces iOS Unicode/Emoji rendering. No external icon fonts or CDNs. */
(() => {
  'use strict';
  const ICONS = Object.freeze({
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    books:'<rect x="3" y="3" width="7" height="18" rx="1"/><path d="M6.5 7v10M13 3h7a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM16.5 7v10"/>',
    heart:'<path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    back:'<path d="m15 18-6-6 6-6"/>',
    publish:'<path d="M13 6h5v5M11 13l7-7"/><path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/>',
    pencil:'<path d="m15 5 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20z"/>',
    sparkles:'<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3zM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16zM19 2l.6 1.5L21 4l-1.4.5L19 6l-.6-1.5L17 4l1.4-.5L19 2z"/>',
    shrine:'<path d="M3 7h18M5 5h14M8 7v13M16 7v13M4 20h16M6 4l6-2 6 2M11 11h2M11 15h2"/>',
    portrait:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2M7 20h10"/>',
    layout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M11 10v11"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    rank:'<path d="m7 4-3 3m3-3 3 3M7 4v16m10 0-3-3m3 3 3-3m-3 3V4"/>',
    chevronDown:'<path d="m6 9 6 6 6-6"/>'
  });
  const makeIcon = name => '<svg class="am-line-icon" xmlns="http://www.w3.org/2000/svg" '+
    'width="24" height="24" viewBox="0 0 24 24" fill="none" '+
    'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" '+
    'stroke-linejoin="round" aria-hidden="true" focusable="false">'+ICONS[name]+'</svg>';
  const buttons=[
    ['.am-bottom-tabs [data-product-target="home"] .product-nav-icon','home'],
    ['.am-bottom-tabs [data-product-target="library"] .product-nav-icon','books'],
    ['.am-bottom-tabs [data-product-target="characters"] .product-nav-icon','heart'],
    ['.am-bottom-tabs [data-product-target="timeline"] .product-nav-icon','calendar'],
    ['.am-bottom-tabs #mobileMoreToggle .product-nav-icon','menu'],
    ['#amBackBtn','back'],
    ['#amOpenPublish > span','publish'],
    ['#amMorePublish > span','publish'],
    ['#amMoreModeToggle > span','pencil'],
    ['.mobile-more-grid [data-product-target="home"] > span','home'],
    ['.mobile-more-grid [data-product-target="studio"] > span','pencil'],
    ['.mobile-more-grid [data-product-target="bangumi"] > span','sparkles'],
    ['.mobile-more-grid [data-product-target="omikuji"] > span','shrine'],
    ['.mobile-more-grid [data-product-target="oshi"] > span','portrait'],
    ['.mobile-more-grid [data-product-target="forms"] > span','layout'],
    ['.library-reference-views [data-library-view="rank"]','rank'],
    ['.library-reference-views [data-library-view="grid"]','grid'],
    ['.library-reference-views [data-library-view="list"]','list']
  ];
  let scheduled = false;
  function apply(){
    scheduled=false;
    for(const [selector,name] of buttons){
      const element=document.querySelector(selector);
      if(element && !element.querySelector('svg.am-line-icon')){
        element.innerHTML=makeIcon(name);
      }
    }
  }
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(apply);
  };
  function install(){
    apply();
    const library=document.getElementById('libraryBrowseView');
    if(library)new MutationObserver(schedule).observe(library,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.AmoristMobileIcons=Object.freeze({render:apply});
})();