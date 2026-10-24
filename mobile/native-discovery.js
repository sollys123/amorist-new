/* Amorist Native Discovery — touch-first work index over the original Bangumi engine.
   Search/grid UI is mobile-native; full editor/import/specialized filters remain available. */
(() => {
  'use strict';
  const section=document.querySelector('.product-view[data-product-view="bangumi"]');
  if(!section)return;
  const host=document.createElement('section');host.className='amx-screen';host.id='amx-screen';
  section.insertBefore(host,section.firstChild);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeSrc=value=>{const s=String(value||'').trim();return /^(https?:\/\/|data:image\/|\.{0,2}\/|assets\/|\/(?!\/))/i.test(s)?s:''};
  const svg=(d)=>'<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>';
  const icons={
    search:svg('<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>'),
    arrow:svg('<path d="m9 18 6-6-6-6"/>'),
    back:svg('<path d="m15 18-6-6 6-6"/>'),
    filter:svg('<path d="M4 6h16M7 12h10M10 18h4"/>'),
    random:svg('<path d="M3 3h7v7M21 21h-7v-7M10 10 3 3m11 11 7 7M3 21l7-7M21 3l-7 7"/>')
  };
  const state={query:'',era:'all',sort:'recent',page:1,advanced:false};
  const api=()=>window.amoristBangumiDiscovery;
  const list=()=>Array.isArray(api()?.getList?.())?api().getList():[];
  const title=g=>g.nameCn||g.name||'未命名作品';
  const year=g=>Number(g.year)||Number(String(g.date||'').slice(0,4))||0;
  const rows=()=>{
    let found=list().filter(g=>state.era==='all'||String(Math.floor(year(g)/10)*10)===state.era);
    const q=state.query.toLowerCase().trim();
    if(q)found=found.filter(g=>(title(g)+' '+(g.name||'')+' '+(g.developer||'')+' '+(g.maker||'')).toLowerCase().includes(q));
    return found.sort((a,b)=>state.sort==='old'?year(a)-year(b):year(b)-year(a));
  };
  const card=g=>{
    const url=safeSrc(g.cover),yearText=year(g)?year(g)+' 年':'日期未记录';
    return '<button type="button" class="amx-card" data-amx="show" data-id="'+esc(g.id)+'">'+
      '<div class="amx-cover">'+(url?'<img loading="lazy" referrerpolicy="no-referrer" src="'+esc(url)+'" alt="'+esc(title(g))+'">':
      '<span class="amx-placeholder">✧</span>')+'</div>'+
      '<b>'+esc(title(g))+'</b><small>'+esc(g.developer||'')+'</small><span>'+esc(yearText)+'</span></button>';
  };
  function render(){
    if(state.advanced){
      host.innerHTML='<div class="amx-toolbar"><button type="button" data-amx="back">'+icons.back+'返回作品索引</button>'+
        '<span>高级检索、人物与资料管理</span></div>';
      return;
    }
    const all=list(),result=rows(),visible=result.slice(0,state.page*36);
    const chips=[['all','全部'],['2020','2020年代'],['2010','2010年代'],['2000','2000年代'],['1990','更早']];
    host.innerHTML='<div class="amx-heading"><span>OTOME INDEX</span><div><h1>作品索引</h1>'+
      '<button type="button" data-amx="random" aria-label="随机发现作品">'+icons.random+'随机邂逅</button></div>'+
      '<p>从作品到制作阵容，寻找下一次值得期待的相遇。</p></div>'+
      '<label class="amx-search">'+icons.search+'<input id="amx-query" type="search" aria-label="搜索作品索引" placeholder="搜索作品名、制作公司…" value="'+esc(state.query)+'"></label>'+
      '<div class="amx-chips">'+chips.map(([id,name])=>'<button type="button" data-amx="era" data-value="'+id+'" class="'+(state.era===id?'active':'')+'">'+name+'</button>').join('')+'</div>'+
      '<div class="amx-options"><span>'+all.length+' 部作品 · 检索结果 '+result.length+' 部</span>'+
      '<select id="amx-sort" aria-label="年代顺序"><option value="recent" '+(state.sort==='recent'?'selected':'')+'>新 → 旧</option>'+
      '<option value="old" '+(state.sort==='old'?'selected':'')+'>旧 → 新</option></select></div>'+
      (visible.length?'<div class="amx-grid">'+visible.map(card).join('')+'</div>':
        '<div class="amx-empty">'+(all.length?'没有匹配的作品，可以尝试更换关键词。':'正在读取作品索引，请检查网络或使用高级检索。')+'</div>')+
      (result.length>visible.length?'<button class="amx-load" type="button" data-amx="more">继续浏览 · 还有 '+(result.length-visible.length)+' 部</button>':'')+
      '<button class="amx-advanced-link" data-amx="advanced" type="button"><span>'+icons.filter+
      '<b>高级筛选与完整资料管理</b></span>'+icons.arrow+'</button>';
  }
  host.addEventListener('click',event=>{
    const target=event.target.closest('[data-amx]');if(!target)return;
    const type=target.dataset.amx;
    if(type==='era'){state.era=target.dataset.value;state.page=1;render();}
    if(type==='more'){state.page++;render();}
    if(type==='random'){
      state.advanced=true;document.body.classList.add('amx-advanced');
      api()?.random?.('any',true);render();window.scrollTo({top:0,behavior:'auto'});
    }
    if(type==='advanced'){
      state.advanced=true;document.body.classList.add('amx-advanced');
      api()?.openSearch?.({scroll:false});render();window.scrollTo({top:0,behavior:'auto'});
    }
    if(type==='show'){
      state.advanced=true;document.body.classList.add('amx-advanced');
      api()?.show?.(target.dataset.id);render();window.scrollTo({top:0,behavior:'auto'});
    }
    if(type==='back'){
      state.advanced=false;document.body.classList.remove('amx-advanced');
      api()?.openSearch?.({scroll:false});render();
      window.scrollTo({top:0,behavior:'auto'});
    }
  });
  host.addEventListener('input',event=>{
    if(event.target.id!=='amx-query')return;
    const pos=event.target.selectionStart;state.query=event.target.value;state.page=1;render();
    const el=host.querySelector('#amx-query');if(el){el.focus();try{el.setSelectionRange(pos,pos)}catch(_){}}
  });
  host.addEventListener('change',event=>{
    if(event.target.id==='amx-sort'){state.sort=event.target.value;state.page=1;render();}
  });
  window.addEventListener('amorist-bangumi-cache-ready',render);
  new MutationObserver(()=>{
    if(!section.classList.contains('active')&&state.advanced){
      state.advanced=false;document.body.classList.remove('amx-advanced');render();
    }
  }).observe(section,{attributes:true,attributeFilter:['class']});
  render();
  window.AmoristNativeDiscovery={render,state};
})();