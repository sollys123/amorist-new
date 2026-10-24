/* Native mobile shrine portal. Original six rituals remain fully functional.
   The unwieldy desktop illustrated map is replaced by six app-native choices. */
(() => {
  'use strict';
  const section=document.querySelector('.product-view[data-product-view="omikuji"]');
  const root=document.getElementById('omikujiSanctuary');
  if(!section||!root)return;
  const menu=document.createElement('div');
  menu.className='amz-screen';menu.id='amz-screen';
  const drawing={
    sakura:'<path d="M12 21V9m0 4-5-5m5 3 5-6"/><path d="M5 3c2 0 4 2 4 4S7 10 5 10 2 8 2 6 3 3 5 3zm14 2c2 0 3 2 3 4s-2 3-4 3-3-2-3-4 2-3 4-3z"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10zM10 21h4M12 2v2"/>',
    ink:'<path d="M5 4h14l-1 15H6L5 4zM7 9h10M10 14c2-3 3-3 5 0"/>',
    water:'<path d="M12 3c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12z"/><path d="M9 17c.8 1.2 2 2 3.5 2"/>',
    ema:'<path d="M12 3 4 7v12h16V7l-8-4zM4 10h16M10 15l2 2 3-4"/>',
    torii:'<path d="M3 5h18M5 3h14M7 6v15M17 6v15M4 21h16M10 10h4"/>'
  };
  const glyph=key=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">'+drawing[key]+'</svg>';
  const choices=[
    {id:'water',name:'水占池',jp:'今日の御籤',desc:'抽取今日的缘分',tag:'DAILY FORTUNE'},
    {id:'sakura',name:'縁結花樹',jp:'人物みくじ',desc:'邂逅一位心动的人',tag:'CHARACTER'},
    {id:'bell',name:'鈴音回廊',jp:'声優みくじ',desc:'倾听声音的相遇',tag:'VOICE'},
    {id:'ink',name:'言霊井',jp:'脚本みくじ',desc:'遇见故事的创造者',tag:'STORY'},
    {id:'ema',name:'絵馬殿',jp:'制作みくじ',desc:'制作人与作品缘分',tag:'MAKERS'},
    {id:'torii',name:'千本鳥居',jp:'作品みくじ',desc:'下一部命定的游戏',tag:'WORKS'}
  ];
  const choicesHtml=choices.map(c=>'<button type="button" class="amz-choice" data-amz="'+c.id+'">'+
    '<div class="amz-choice-icon">'+glyph(c.id)+'</div>'+
    '<span class="amz-choice-en">'+c.tag+'</span>'+
    '<strong>'+c.name+'</strong><span class="amz-choice-jp">'+c.jp+'</span>'+
    '<p>'+c.desc+'</p></button>').join('');
  menu.innerHTML='<div class="amz-hero"><div class="amz-hero-petals" aria-hidden="true">✧</div>'+
    '<span class="amz-kicker">ENMUSUBI JINJA · AMORIST</span>'+
    '<h1>御签所</h1><p>良縁に恵まれますように。</p>'+
    '<span class="amz-intro">在六处不同的境地，寻找今天与你相遇的缘分。</span></div>'+
    '<div class="amz-section-head"><div><span>CHOOSE YOUR DESTINY</span><h2>今天去哪里参拜？</h2></div>'+
    '<small>六处缘结之所</small></div>'+
    '<div class="amz-choices">'+choicesHtml+'</div>'+
    '<p class="amz-footer">一期一会 · 願いの行方は風のままに</p>';
  section.insertBefore(menu,root);
  function sync(){
    const isMap=root.dataset.view==='map'||!root.dataset.view;
    section.classList.toggle('amz-ritual-open',!isMap);
    menu.hidden=!isMap;
    if(isMap)requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
  }
  menu.addEventListener('click',event=>{
    const b=event.target.closest('button[data-amz]');if(!b)return;
    const original=root.querySelector('[data-shrine-place="'+b.dataset.amz+'"]');
    if(original)original.click();
  });
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-view']});
  sync();
  window.AmoristNativeShrine={sync,choices:choices.map(c=>c.id)};
})();