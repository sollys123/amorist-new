/* Amorist Native UI v3 — a dedicated mobile application presentation layer.
 * Reuses the original data model and editor engines, not the desktop page layout.
 * Exportable REPO and self-introduction canvases remain untouched.
 */
(() => {
  'use strict';
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const model=window.AmoristDataModel||{};
  const read=(key,fallback)=>{try{const obj=JSON.parse(localStorage.getItem(key)||'null');return obj??fallback}catch{return fallback}};
  const games=()=>{const a=read('amorist-game-library-v1',[]);return Array.isArray(a)?a:[]};
  const chars=()=>{const a=read('amorist-character-book-v1',[]);return Array.isArray(a)?a:[]};
  const profile=()=>read('amorist-profile-v1',{});
  const events=()=>{const a=read('amorist-timeline-events-v1',[]);return Array.isArray(a)?a:Array.isArray(a?.events)?a.events:[]};
  const fav=()=>read('amorist-oshi-hub-v1',{records:[],order:[]});
  const gameMap=()=>new Map(games().map(g=>[String(g.id),g]));
  const safeSrc=value=>{
    const v=String(value||'').trim();
    return /^(https?:\/\/|data:image\/|blob:|\/(?!\/)|\.{0,2}\/|assets\/|idb-image:|image:)/i.test(v)?v:'';
  };
  const art=(src,alt='',extra='',fallback='')=>{
    const url=safeSrc(src)||safeSrc(fallback);
    const fallbackUrl=safeSrc(fallback);
    return url?'<img loading="lazy" decoding="async" referrerpolicy="no-referrer" data-amv-image="'+esc(url)+'" '+
      (fallbackUrl&&fallbackUrl!==url?'data-amv-fallback="'+esc(fallbackUrl)+'" ':'')+
      'src="'+esc(url)+'" alt="'+esc(alt)+'" '+extra+'>':
      '<span class="amv-art-empty" aria-hidden="true">✧</span>';
  };
  const icons={
    plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    arrow:'<path d="m9 18 6-6-6-6"/>',back:'<path d="m15 18-6-6 6-6"/>',
    edit:'<path d="m4 20 4-.9L19.3 7.8a2.4 2.4 0 0 0-3.4-3.4L4.9 15.7 4 20z"/>',
    list:'<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    book:'<rect x="3" y="3" width="7" height="18" rx="1"/><path d="M13 3h7a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>',
    heart:'<path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    wand:'<path d="m4 20 12-12 4 4L8 24M15 4l1-3M20 6l3-1M9 5 8 2"/>',
    upload:'<path d="m12 16 0-12m-5 5 5-5 5 5M4 16v4h16v-4"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M3 12h2m14 0h2M12 3v2m0 14v2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    check:'<path d="m5 12 5 5L20 7"/>',filter:'<path d="M4 6h16M7 12h10M10 18h4"/>'
  };
  const icon=(name,size=20)=>'<svg class="amv-icon" aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]||icons.arrow)+'</svg>';
  const state={route:'home',lib:{query:'',status:'全部',sort:'updated',layout:'cover',detail:'',manage:false,selected:new Set()},
    chars:{query:'',role:'all',preference:'all',detail:''},
    timeline:{mode:'calendar',month:new Date().toISOString().slice(0,7),day:''},
    oshi:{detail:'',advanced:false},
    calendarAdvanced:false,homePreview:false,homeAbout:false};
  const VIEWS=['home','library','characters','timeline','oshi'];
  const mount=(name)=>{const s=$('.product-view[data-product-view="'+name+'"]');if(!s)return null;
    const host=document.createElement('div');host.className='amv-screen';host.id='amv-'+name;
    host.setAttribute('data-amv-screen',name);s.insertBefore(host,s.firstChild);return host;};
  const hosts=Object.fromEntries(VIEWS.map(name=>[name,mount(name)]));
  const draftDialog=document.createElement('dialog');
  draftDialog.id='amvSheet';draftDialog.className='amv-sheet';
  draftDialog.setAttribute('aria-label','档案操作');
  document.body.append(draftDialog);
  const toast=message=>window.AmoristMobile?.toast?.(message);
  const isEditing=()=>window.AmoristMobileMode?.isEditing?.()===true;
  const adminButton=(name,label,ic='plus',kind='soft')=>isEditing()?actionButton(name,label,ic,kind):'';
  const quoteByView={
    library:'Whatever our souls are made of, his and mine are the same',
    characters:'L’amour est comme la fièvre, il naît et s’éteint sans que la volonté y ait la moindre part',
    timeline:'只留下日期、封面与状态。作品名在需要时出现，不再占据每一个日历格。',
    oshi:'Liebe ist, daß Du mir das Messer bist, mit dem ich in mir wühle.',
    forms:'در ازل پرتوِ حُسنت ز تجلی دَم زد ,عشق پیدا شد و آتش به همه عالم زد',
    bangumi:'Estar contigo o no estar contigo es la medida de mi tiempo'
  };
  const go=name=>window.amoristProductNavigate?.(name,true);
  const heading=(eyebrow,title,subtitle,action)=>'<div class="amv-heading"><div>'+
    '<span class="amv-eyebrow">'+esc(eyebrow)+'</span><h1>'+esc(title)+'</h1>'+
    (subtitle?'<p>'+esc(subtitle)+'</p>':'')+'</div>'+
    (action||'')+'</div>';
  const actionButton=(id,label,iconName='plus',kind='soft')=>'<button class="amv-btn amv-btn-'+kind+'" type="button" data-amv="'+id+'">'+icon(iconName,18)+'<span>'+esc(label)+'</span></button>';
  const empty=(title,body)=>'<div class="amv-empty">'+icon('book',28)+'<strong>'+esc(title)+'</strong><p>'+esc(body)+'</p></div>';
  const footerLabel=(text)=>'<div class="amv-footer-note">'+esc(text)+'</div>';
  const filterStatus=['全部','已全通','进行中','已封盘','已买未打','心愿单','尚未分类'];
  const categories=(model.GAME_CATEGORIES||[
    {id:'hall_of_fame',label:'殿堂入り'},{id:'love',label:'大好き'},{id:'like',label:'好き'},
    {id:'normal',label:'普通'},{id:'difficult',label:'苦手'},{id:'unclassified',label:'未分類'}
  ]);
  const preferenceLabel=value=>model.gameCategoryLabel?.(value)||categories.find(x=>x.id===value)?.label||value||'未分类';
  const charPreference=value=>model.characterPreferenceLabel?.(value)||value||'未分类';
  const statusBadge=status=>'<span class="amv-status" data-status="'+esc(status)+'">'+esc(status||'尚未分类')+'</span>';
  const dateLabel=raw=>{if(!raw)return '';const d=new Date(String(raw));return isNaN(d)?String(raw).slice(0,10):new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric'}).format(d)};
  const nativeCover=(game,extra='')=>'<div class="amv-cover '+extra+'">'+art(game?.cover,game?.name||'作品封面')+'</div>';
  const sortedGames=()=>{
    const v=state.lib;
    return games().filter(g=>(v.status==='全部'||String(g.status||'尚未分类')===v.status) &&
      (!v.query||(String(g.name||'')+' '+String(g.note||'')).toLowerCase().includes(v.query.toLowerCase())))
      .sort((a,b)=>v.sort==='name'?String(a.name||'').localeCompare(String(b.name||''),'zh'):
        String(b[v.sort==='started'?'startedAt':v.sort==='completed'?'completedAt':'updatedAt']||'')
          .localeCompare(String(a[v.sort==='started'?'startedAt':v.sort==='completed'?'completedAt':'updatedAt']||'')));
  };
  const cardGame=(g,layout)=>{
    const id=esc(g.id),chosen=state.lib.selected.has(String(g.id));
    const cover=nativeCover(g);
    const title='<div class="amv-game-info"><strong>'+esc(g.name||'无标题')+'</strong>'+
      '<small>'+esc(g.platform||'')+(g.hours?' · '+esc(g.hours)+'h':'')+'</small>'+
      '<div class="amv-card-badges">'+statusBadge(g.status)+
      (g.category&&g.category!=='unclassified'?'<span class="amv-category">'+esc(preferenceLabel(g.category))+'</span>':'')+'</div></div>';
    return '<button type="button" class="amv-game-card '+(layout==='list'?'amv-game-row':'')+'" data-amv="open-game" data-id="'+id+'">'+
      (state.lib.manage?'<span class="amv-selection '+(chosen?'checked':'')+'">'+(chosen?icon('check',15):'')+'</span>':'')+
      cover+title+icon('arrow',18)+'</button>';
  };
  const cardCharacter=(c,mapping)=>{
    const id=esc(c.id),work=mapping.get(String(c.gameId));
    const img=safeSrc(c.image);
    return '<button type="button" class="amv-char-card" data-amv="open-char" data-id="'+id+'">'+
      '<div class="amv-char-visual">'+art(img,c.name||c.nameCn||'角色图')+
      '<span class="amv-char-preference">'+esc(charPreference(c.preference))+'</span></div>'+
      '<strong>'+esc(c.nameCn||c.name||'未知角色')+'</strong>'+
      '<small>'+esc(work?.name||'未关联作品')+'</small></button>';
  };
  function renderAbout(){
    const el=hosts.home,p=profile(),name=String(p.name||p.handle||'').trim();
    if(!el)return;
    const groups=[
      {tag:'PROFILE / ABOUT ME',title:'PROFILE',fields:[['NAME','name'],['HANDLE','handle'],['AGE','age'],['SINCE','years'],['BIOGRAPHY','bio']]},
      {tag:'PLAY STYLE',title:'PLAY RECORD',fields:[['HABIT','habit'],['DEVICE','platforms'],['LANGUAGE','languages'],['ATTRIBUTE','attribute'],['PLAY STYLE','playstyle'],['PLAY PACE','playPace']]},
      {tag:'TASTE / PREFERENCE',title:'TASTE',fields:[['ARTIST','artist'],['WRITER','writer'],['WORKS','works'],['WORLDVIEW','worldview'],['HEROINE TYPE','character'],['VOICE ACTOR','voiceActors'],['XP TAGS','tags'],['RELATIONSHIP','relationship'],['MY OSHIS','oshiChars']]},
      {tag:'NOTE / SOCIAL',title:'MORE ABOUT ME',fields:[['BOUNDARIES','boundaries'],['SAME FAN','sameFan'],['ACCOUNT CONTENT','account'],['NOTE','note'],['REDNOTE','xhs'],['NS ID','platformId'],['KKV','contactValue']]}
    ];
    const detail=groups.map(group=>{
      const pairs=group.fields.filter(row=>String(p[row[1]]??'').trim());
      if(!pairs.length)return '';
      return '<section class="amv-about-group"><span class="amv-eyebrow">'+esc(group.tag)+'</span>'+
        '<h2>'+esc(group.title)+'</h2><dl>'+pairs.map(([label,key])=>'<div><dt>'+esc(label)+'</dt>'+
        '<dd>'+esc(p[key])+'</dd></div>').join('')+'</dl></section>';
    }).join('');
    el.innerHTML='<div class="amv-about"><button type="button" class="amv-inline-back" data-amv="close-about">'+icon('back',17)+'返回</button>'+
      '<div class="amv-about-head"><div class="amv-about-avatar">'+art(p.avatar||'',name)+'</div>'+
      '<div><span class="amv-eyebrow">PRIVATE / SELF INTRODUCTION</span><h1>'+esc(name||'OTOME PROFILE')+'</h1>'+
      (p.handle?'<p>'+esc(p.handle)+'</p>':'')+'</div></div>'+
      detail+(isEditing()?'<div class="amv-about-edit">'+actionButton('edit-profile','编辑 PROFILE','edit','soft')+
      actionButton('preview-profile','预览原始自介图','wand','soft')+'</div>':'')+'</div>';
    hydrateImages(el);
  }
  function renderHome(){
    const el=hosts.home;if(!el)return;
    if(state.homeAbout){renderAbout();return}
    if(state.homePreview){el.innerHTML='<div class="amv-preview-nav"><button type="button" data-amv="close-profile-preview">'+icon('back',18)+'返回应用主页</button><span>自介图专属排版 · 可在下方编辑并导出图片</span></div>';return}
    const p=profile(),gs=games(),cs=chars(),timeline=events().slice().sort((a,b)=>String(b.occurredAt||'').localeCompare(String(a.occurredAt||'')));
    const current=gs.filter(g=>g.status==='进行中').slice(0,8);
    const all=gs.length,done=gs.filter(g=>g.status==='已全通').length;
    const name=String(p.name||p.handle||'HARU').trim();
    const banner='<div class="amv-home-hero"><span class="amv-hero-star">✧</span>'+
      '<div class="amv-hero-copy"><span>PRIVATE / SELF INTRODUCTION</span><h1>OTOME<br>PROFILE</h1>'+
      (p.bio?'<p>'+esc(p.bio)+'</p>':'')+
      (p.handle?'<p class="amv-home-handle">'+esc(p.handle)+'</p>':'')+'</div>'+
      (p.avatar?'<div class="amv-hero-avatar">'+art(p.avatar,name)+'</div>':'')+'</div>';
    const stats='<div class="amv-stat-strip"><div><strong>'+all+'</strong><span>收藏游戏</span></div>'+
      '<div><strong>'+done+'</strong><span>已全通</span></div>'+
      '<div><strong>'+cs.length+'</strong><span>收藏角色</span></div></div>';
    const shortcuts=isEditing()?'<div class="amv-quick-grid">'+
      '<button data-amv="new-game" type="button">'+icon('plus',20)+'<b>ADD GAME</b></button>'+
      '<button data-amv="new-session" type="button">'+icon('clock',20)+'<b>PLAY LOG</b></button>'+
      '<button data-amv="nav-studio" type="button">'+icon('edit',20)+'<b>REPO</b></button></div>':'';
    const playing='<section class="amv-section">'+
      '<div class="amv-section-title"><div><span>NOW PLAYING</span><h2>最近正在玩</h2></div>'+
      '<button data-amv="nav-library" type="button" class="amv-text-link">全部游戏 '+icon('arrow',15)+'</button></div>'+
      (current.length?'<div class="amv-hscroll">'+current.map(g=>'<button type="button" class="amv-playing-card" data-amv="home-game" data-id="'+esc(g.id)+'">'+
        nativeCover(g)+'<b>'+esc(g.name)+'</b><small>'+esc(g.progress||0)+'% · 进行中</small></button>').join('')+'</div>':
        empty('还没有正在游玩的作品','在游戏档案中添加或调整游玩状态'))+'</section>';
    const recent='<section class="amv-section">'+
      '<div class="amv-section-title"><div><span>PLAY JOURNAL</span><h2>最近的记录</h2></div>'+
      '<button type="button" class="amv-text-link" data-amv="nav-timeline">游玩日历 '+icon('arrow',15)+'</button></div>'+
      (timeline.length?'<div class="amv-recent-list">'+timeline.slice(0,3).map(e=>{
        const title=gameMap().get(String(e.gameId))?.name||e.title||'游玩记录';
        return '<button type="button" class="amv-recent-item" data-amv="nav-timeline">'+
          '<div class="amv-rec-date">'+esc(String(e.occurredAt||'').slice(5).replace('-','/'))+'</div>'+
          '<div><b>'+esc(title)+'</b><small>'+esc(e.note||({started:'开始游玩',completed:'完成作品',session:'游玩记录'}[e.type]||'档案记录'))+'</small></div>'+
          icon('arrow',16)+'</button>';
      }).join('')+'</div>':empty('尚未留下游玩记录','可以从这里开始记录每天的游戏时间'))+'</section>';
    const personal='<section class="amv-section"><div class="amv-section-title"><div><span>ABOUT ME</span><h2>我的个人档案</h2></div>'+
      (isEditing()?'<button type="button" data-amv="edit-profile" class="amv-text-link">EDIT '+icon('edit',15)+'</button>':'')+'</div>'+
      '<div class="amv-profile-card"><div class="amv-profile-avatar">'+art(p.avatar,name)+'</div><div class="amv-profile-copy"><strong>'+esc(name)+'</strong>'+
      '<p>'+esc(p.bio||p.type||'记录喜欢的作品与角色。')+'</p></div></div>'+
      '<button class="amv-export-row" data-amv="view-profile" type="button">'+
      '<span>'+icon('book',19)+'<b>PROFILE / ABOUT ME</b></span>'+icon('arrow',17)+'</button>'+
      (isEditing()?'<button class="amv-export-row" data-amv="preview-profile" type="button">'+
      '<span>'+icon('wand',19)+'<b>SELF INTRODUCTION / EXPORT</b></span>'+icon('arrow',17)+'</button>':'')+'</section>';
    el.innerHTML='<div class="amv-home">'+banner+stats+shortcuts+playing+recent+personal+footerLabel('Made of stories & a little affection · Amorist')+'</div>';
    hydrateImages(el);
  }
  function renderLibrary(){
    const el=hosts.library;if(!el)return;
    const v=state.lib,all=games();
    if(v.detail){renderGameDetail();return}
    const counts=all.length,done=all.filter(g=>g.status==='已全通').length,active=all.filter(g=>g.status==='进行中').length;
    const cards=sortedGames();
    const controls='<div class="amv-library-controls">'+
      '<label class="amv-search">'+icon('search',19)+'<input type="search" id="amvLibrarySearch" placeholder="搜索游戏名、记录…" value="'+esc(v.query)+'" autocomplete="off" aria-label="搜索游戏"></label>'+
      '<div class="amv-filter-scroll" role="group" aria-label="游玩状态筛选">'+filterStatus.map(f=>
      '<button data-amv="lib-status" type="button" data-value="'+esc(f)+'" class="amv-chip '+(v.status===f?'active':'')+'">'+esc(f)+'</button>').join('')+'</div>'+
      '<div class="amv-toolbar"><label class="amv-sort-label">排序 <select id="amvSort" aria-label="游戏排序">'+[
      ['updated','最近更新'],['started','开始日期'],['completed','通关日期'],['name','作品名称']].map(item=>
      '<option value="'+item[0]+'" '+(v.sort===item[0]?'selected':'')+'>'+item[1]+'</option>').join('')+'</select></label>'+
      '<div class="amv-segment" role="group" aria-label="游戏视图">'+[
      ['cover','grid'],['list','list'],['rank','layers']].map(row=>
      '<button type="button" class="'+(v.layout===row[0]?'selected':'')+'" data-amv="lib-layout" data-value="'+row[0]+'" aria-label="'+({cover:'封面视图',list:'列表视图',rank:'喜好分类'}[row[0]])+'">'+icon(row[1],18)+'</button>').join('')+'</div></div></div>';
    const start=heading('MY GAME ARCHIVE','游戏档案',quoteByView.library,adminButton('new-game','ADD','plus','primary'));
    const metrics='<div class="amv-metrics"><div><b>'+counts+'</b><span>全部作品</span></div><div><b>'+done+'</b><span>已全通</span></div><div><b>'+active+'</b><span>进行中</span></div></div>';
    const manage='<div class="amv-subtoolbar"><span>'+cards.length+' 部作品</span>'+
      (isEditing()?'<button class="amv-plain-link" type="button" data-amv="lib-manage">'+(v.manage?'完成':'MANAGE')+'</button>':'')+'</div>';
    let collection='';
    if(v.layout==='rank'){
      collection='<div class="amv-rank-groups">'+categories.map(cat=>{
        const rows=cards.filter(g=>String(model.normalizeGameCategory?.(g.category)||g.category||'unclassified')===cat.id);
        return '<section class="amv-rank-group"><div class="amv-group-head"><h2>'+esc(cat.label)+'</h2><span>'+rows.length+' 部</span></div>'+
          (rows.length?'<div class="amv-rank-track">'+rows.map(g=>cardGame(g,'cover')).join('')+'</div>':
            '<p class="amv-group-empty">这个分类还没有作品</p>')+'</section>';
      }).join('')+'</div>';
    }else{
      collection=cards.length?'<div class="amv-game-grid '+(v.layout==='list'?'as-list':'')+'">'+cards.map(g=>cardGame(g,v.layout)).join('')+'</div>':
        empty('没有找到作品','试着更换筛选条件，或者添加新的游戏。');
    }
    const bulk=isEditing()&&v.manage?'<div class="amv-bulkbar"><span>已选 '+v.selected.size+' 部</span>'+
      '<button type="button" data-amv="bulk-status">状态</button><button type="button" data-amv="bulk-category">喜好</button>'+
      '<button type="button" data-amv="bulk-delete" class="danger">删除</button></div>':'';
    el.innerHTML=start+metrics+controls+manage+collection+bulk;
    hydrateImages(el);
  }
  function renderGameDetail(){
    const el=hosts.library,g=games().find(row=>String(row.id)===String(state.lib.detail));
    if(!el)return;if(!g){state.lib.detail='';renderLibrary();return}
    const cover='<div class="amv-game-detail-head">'+nativeCover(g)+
      '<div class="amv-game-detail-title"><span class="amv-eyebrow">GAME RECORD</span>'+
      '<h1>'+esc(g.name||'无标题')+'</h1>'+statusBadge(g.status)+
      '<p>'+esc(g.platform||'未记录平台')+'</p></div></div>';
    const progress=Math.max(0,Math.min(100,Number(g.progress)||0));
    const lines=[['个人喜好',preferenceLabel(g.category)],['游玩时长',g.hours?g.hours+' 小时':'未记录'],
      ['开始日期',g.startedAt||'未记录'],['完成日期',g.completedAt||'未记录'],
      ['已完成线路',Array.isArray(g.routeDone)?g.routeDone.length+' / '+(g.routes||[]).length:'未记录']];
    const rows='<div class="amv-facts">'+lines.map(row=>'<div><span>'+esc(row[0])+'</span><strong>'+esc(row[1])+'</strong></div>').join('')+'</div>';
    const routes=Array.isArray(g.routes)&&g.routes.length?'<section class="amv-detail-section"><h2>攻略路线</h2><div class="amv-route-chips">'+
      g.routes.map(r=>'<span class="'+(g.routeDone?.includes(r)?'done':'')+'">'+(g.routeDone?.includes(r)?icon('check',14):'')+esc(r)+'</span>').join('')+'</div></section>':'';
    const notes='<section class="amv-detail-section"><h2>个人记录</h2><p class="amv-prose">'+esc(g.note||'还没有写下对这部作品的印象。')+'</p></section>';
    const logs=Array.isArray(g.logs)&&g.logs.length?'<section class="amv-detail-section"><h2>游玩笔记</h2>'+
      g.logs.slice(-5).reverse().map(x=>'<div class="amv-log-row"><small>'+esc(x.date||x.createdAt||'')+'</small><p>'+esc(x.text||x.note||'')+'</p></div>').join('')+'</section>':'';
    el.innerHTML='<div class="amv-native-detail"><button class="amv-inline-back" data-amv="back-games" type="button">'+icon('back',17)+'返回游戏库</button>'+
      cover+'<div class="amv-detail-actions">'+adminButton('edit-game','EDIT','edit','primary')+
      actionButton('game-repo','REPO','wand','soft')+'</div>'+
      '<div class="amv-detail-progress"><div><span>游玩进度</span><b>'+progress+'%</b></div>'+
      '<div class="amv-progress"><i style="width:'+progress+'%"></i></div></div>'+
      rows+routes+notes+logs+'<button class="amv-export-row" data-amv="advanced-game" type="button"><span>'+
      icon('layers',18)+'<b>详细记录、路线与更多功能</b></span>'+icon('arrow',18)+'</button></div>';
    hydrateImages(el);
  }
  function visibleChars(){
    const gs=gameMap();const v=state.chars;let rows=chars().filter(c=>!c.animeId&&!Array.isArray(c.animeIds));
    // Character-archive visibility follows the original game's play-status gate.
    const vis=window.AmoristCharacterBookVisibility?.visibleStatuses;
    if(vis?.has)rows=rows.filter(c=>gs.has(String(c.gameId))&&vis.has(String(gs.get(String(c.gameId)).status||'')));
    return rows.filter(c=>(v.role==='all'||String(c.roleType||'unset')===v.role)&&
      (v.preference==='all'||String(c.preference||'unclassified')===v.preference)&&
      (!v.query||(String(c.name||'')+' '+String(c.nameCn||'')+' '+String(c.cv||'')+' '+
        String(gs.get(String(c.gameId))?.name||'')).toLowerCase().includes(v.query.toLowerCase())))
      .sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0));
  }
  function renderCharacters(){
    const el=hosts.characters;if(!el)return;
    if(state.chars.detail){renderCharacterDetail();return}
    const cs=visibleChars(),v=state.chars,all=chars().filter(c=>!c.animeId),map=gameMap();
    const start=heading('CHARACTER BOOK','角色图鉴',quoteByView.characters,adminButton('new-char','ADD','plus','primary'));
    const metrics='<div class="amv-metrics"><div><b>'+all.length+'</b><span>全部角色</span></div>'+
      '<div><b>'+all.filter(c=>c.preference==='favorite').length+'</b><span>最推</span></div>'+
      '<div><b>'+new Set(all.map(c=>c.gameId).filter(Boolean)).size+'</b><span>所属作品</span></div></div>';
    const role=[['all','全部'],['route','攻略对象'],['protagonist','主人公'],['sub','其他角色']];
    const pref=[['all','全部喜好'],['favorite','最推'],['oshi','推'],['like','喜欢'],['good','好印象'],['curious','感兴趣'],['normal','普通'],['difficult','苦手'],['excluded','対象外'],['unclassified','未分类']];
    const tools='<div class="amv-library-controls"><label class="amv-search">'+icon('search',19)+
      '<input type="search" id="amvCharSearch" placeholder="搜索角色或所属作品…" value="'+esc(v.query)+'" autocomplete="off"></label>'+
      '<div class="amv-filter-scroll">'+role.map(x=>'<button class="amv-chip '+(v.role===x[0]?'active':'')+
      '" type="button" data-amv="char-role" data-value="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+
      '<div class="amv-filter-scroll amv-secondary-chips">'+pref.map(x=>'<button class="amv-chip '+(v.preference===x[0]?'active':'')+
      '" type="button" data-amv="char-preference" data-value="'+x[0]+'">'+x[1]+'</button>').join('')+'</div></div>';
    el.innerHTML=start+metrics+tools+'<div class="amv-subtoolbar"><span>'+cs.length+' 位角色</span>'+
      '<button type="button" class="amv-plain-link" data-amv="nav-oshi">推角展示 '+icon('arrow',14)+'</button></div>'+
      (cs.length?'<div class="amv-char-grid">'+cs.map(c=>cardCharacter(c,map)).join('')+'</div>':
        empty('没有符合条件的角色','尝试调整筛选，或导入一个新角色。'));
    hydrateImages(el);
  }
  function renderCharacterDetail(){
    const el=hosts.characters,cs=chars(),c=cs.find(x=>String(x.id)===String(state.chars.detail));
    if(!el)return;if(!c){state.chars.detail='';renderCharacters();return}
    const g=gameMap().get(String(c.gameId));
    const artview='<div class="amv-character-hero">'+art(c.image,c.name||'角色')+'</div>';
    const fields=[['角色姓名',c.name||''],['中文姓名',c.nameCn||''],['所属作品',g?.name||''],
      ['人物身份',({route:'攻略对象',protagonist:'主人公',sub:'其他角色'}[c.roleType]||'未分类')],
      ['喜好分类',charPreference(c.preference)],['声优',c.cv||'']];
    el.innerHTML='<div class="amv-native-detail"><button type="button" class="amv-inline-back" data-amv="back-chars">'+icon('back',17)+'返回角色图鉴</button>'+
      artview+'<span class="amv-eyebrow amv-detail-eyebrow">CHARACTER PROFILE</span><h1 class="amv-char-title">'+esc(c.nameCn||c.name||'未知角色')+'</h1>'+
      '<p class="amv-char-subtitle">'+esc(c.nameCn&&c.name?c.name:'')+'</p>'+
      '<div class="amv-detail-actions">'+adminButton('edit-char','EDIT','edit','primary')+
      (c.bangumiCharacterId?actionButton('char-original','人物详情','heart','soft'):'')+'</div>'+
      '<div class="amv-facts">'+fields.map(x=>'<div><span>'+esc(x[0])+'</span><strong>'+esc(x[1]||'未记录')+'</strong></div>').join('')+'</div>'+
      (c.note||c.summary?'<section class="amv-detail-section"><h2>人物笔记</h2><p class="amv-prose">'+esc(c.note||c.summary)+'</p></section>':'')+
      (g?'<button class="amv-export-row" type="button" data-amv="char-game" data-id="'+esc(g.id)+'"><span>'+icon('book',18)+'<b>查看所属作品</b></span>'+icon('arrow',18)+'</button>':'')+
      '</div>';
    hydrateImages(el);
  }
  const typeNames={started:'开始游玩',completed:'通关作品',session:'游玩记录',route_completed:'通关路线'};
  const monthShift=(month,n)=>{const [y,m]=String(month).split('-').map(Number);const d=new Date(y,m-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
  function renderTimeline(){
    const el=hosts.timeline;if(!el)return;
    if(state.calendarAdvanced){el.innerHTML='<div class="amv-preview-nav"><button type="button" data-amv="timeline-back">'+icon('back',18)+'返回游玩日历</button><span>完整历史时间线与批量管理功能</span></div>';return}
    const v=state.timeline,gs=gameMap(),items=events().filter(x=>x.occurredAt).sort((a,b)=>String(b.occurredAt).localeCompare(String(a.occurredAt)));
    const header=heading('PLAY CHRONICLE','游玩日历',quoteByView.timeline,adminButton('new-session','ADD','plus','primary'));
    const modes='<div class="amv-full-segment">'+['calendar','feed'].map((x,i)=>
      '<button type="button" data-amv="timeline-mode" data-value="'+x+'" class="'+(v.mode===x?'active':'')+'">'+
      (i?'游玩记录':'月历视图')+'</button>').join('')+'</div>';
    let content='';
    if(v.mode==='calendar'){
      const [year,mon]=v.month.split('-').map(Number),offset=new Date(year,mon-1,1).getDay();
      const total=new Date(year,mon,0).getDate();
      const map=new Map();
      items.forEach(e=>{const k=String(e.occurredAt||'').slice(0,10);if(k.length===10)map.set(k,(map.get(k)||0)+1)});
      let days='';
      for(let i=0;i<offset;i++)days+='<div class="amv-day-blank"></div>';
      for(let day=1;day<=total;day++){
        const date=v.month+'-'+String(day).padStart(2,'0'),count=map.get(date)||0;
        const today=new Date().toISOString().slice(0,10)===date;
        days+='<button type="button" class="amv-day '+(v.day===date?'picked ':'')+(today?'today ':'')+
          '" data-amv="pick-day" data-value="'+date+'"><span>'+day+'</span>'+
          (count?'<i></i>':'')+'</button>';
      }
      const dayItems=items.filter(e=>String(e.occurredAt||'').slice(0,10)===v.day);
      const monthly=items.filter(e=>String(e.occurredAt||'').startsWith(v.month));
      content='<div class="amv-calendar-panel"><div class="amv-month-head">'+
        '<button class="amv-icon-button" type="button" data-amv="month-prev" aria-label="上个月">'+icon('back',20)+'</button>'+
        '<div><span>'+year+'</span><strong>'+String(mon).padStart(2,'0')+' 月</strong></div>'+
        '<button class="amv-icon-button" type="button" data-amv="month-next" aria-label="下个月">'+icon('arrow',20)+'</button></div>'+
        '<div class="amv-weekdays">'+['日','一','二','三','四','五','六'].map(s=>'<span>'+s+'</span>').join('')+'</div>'+
        '<div class="amv-calendar-grid">'+days+'</div><div class="amv-month-footer"><span>本月 '+monthly.length+' 条记录</span>'+
        '<button type="button" data-amv="month-today">回到本月</button></div></div>'+
        '<section class="amv-section"><div class="amv-section-title"><div><span>DAILY NOTES</span><h2>'+
        (v.day?esc(v.day)+' 的记录':'本月记录')+'</h2></div></div>'+
        renderEventList(v.day?dayItems:monthly.slice(0,8),gs)+'</section>';
    }else{
      const byMonth=new Map();items.forEach(e=>{const key=String(e.occurredAt||'').slice(0,7)||'未注明月份';
        if(!byMonth.has(key))byMonth.set(key,[]);byMonth.get(key).push(e);});
      content='<div class="amv-feed">'+(items.length?Array.from(byMonth).map(([month,rows])=>
        '<section><div class="amv-feed-month">'+esc(month)+'</div>'+renderEventList(rows,gs)+'</section>').join(''):
        empty('游玩日历还是空的','添加游戏的开始或完成日期，或者记录每天的游玩。'))+'</div>';
    }
    el.innerHTML=header+modes+content+(isEditing()?'<button class="amv-export-row amv-timeline-advanced" type="button" data-amv="timeline-advanced">'+
      '<span>'+icon('layers',18)+'<b>PLAY LOG / MANAGE</b></span>'+icon('arrow',18)+'</button>':'');
    hydrateImages(el);
  }
  function renderEventList(items,mapping){
    if(!items.length)return empty('这段时间还没有记录','可以添加游玩记录，回顾一次美好的相遇。');
    return '<div class="amv-event-list">'+items.map(e=>{
      const g=mapping.get(String(e.gameId)),kind=typeNames[e.type]||e.title||'游玩记录';
      return '<button type="button" class="amv-event-item" data-amv="event-open" data-id="'+esc(e.id||'')+'">'+
        '<div class="amv-event-symbol">'+icon(e.type==='completed'?'heart':e.type==='started'?'book':'clock',19)+'</div>'+
        '<div class="amv-event-text"><div><small>'+esc(e.occurredAt||'')+'</small><span>'+esc(kind)+'</span></div>'+
        '<strong>'+esc(g?.name||e.title||'未关联作品')+'</strong>'+
        (e.note?'<p>'+esc(e.note)+'</p>':'')+'</div>'+icon('arrow',16)+'</button>';
    }).join('')+'</div>';
  }
  // Use the original curated Oshi record and its own detail renderer. The v3
  // implementation opened the first unrelated portrait and then tried to
  // invoke a non-existent method on an HTMLElement. Avoid that entirely.
  function closeOshiAdvanced(){
    $('#oshiDrawerClose')?.click();
    window.amoristOshiOpenHub?.();
    state.oshi.detail='';
    state.oshi.advanced=false;
    document.body.classList.remove('amv-legacy-oshi');
    renderOshi();
  }
  function showOriginalOshi(id, openEditor=false){
    // The source hub recreates index buttons and its MutationObserver assigns
    // data-oshi-order-id in a microtask. Resolve the ID after the real DOM
    // has settled; never fall back to a different person's first card.
    window.amoristOshiOpenHub?.();
    requestAnimationFrame(()=>{
      const selected=$$('#oshiIndexList .oshi-index-link').find(button=>
        String(button.dataset.oshiOrderId||'')===String(id));
      if(!selected){
        state.oshi.advanced=false;
        state.oshi.detail=String(id);
        document.body.classList.remove('amv-legacy-oshi');
        renderOshi();
        toast('该人物的原始展板未找到，已显示其档案。');
        return;
      }
      selected.click();
      state.oshi.detail=String(id);
      state.oshi.advanced=true;
      document.body.classList.add('amv-legacy-oshi');
      renderOshi();
      if(openEditor && isEditing())
        requestAnimationFrame(()=>$('#oshiEditDetailButton')?.click());
      window.scrollTo({top:0,behavior:'auto'});
    });
    return true;
  }
  function renderOshi(){
    const el=hosts.oshi;if(!el)return;
    if(state.oshi.advanced){
      el.innerHTML='<div class="amv-legacy-gateway">'+
        '<button type="button" class="amv-inline-back" data-amv="oshi-back">'+icon('back',18)+'INDEX / 好きな人たち</button>'+
        (isEditing()?'<span class="amv-legacy-edit-hint">EDITOR / Oshi archive</span>':'')+
        '</div>';
      return;
    }
    const stored=fav(),allGames=games(),gs=gameMap();
    const all=chars().map(row=>model.normalizeCharacterRecord?.(row,allGames)||row);
    const chosen=all.filter(c=>!c.animeId && !Array.isArray(c.animeIds) &&
      c.roleType==='route' && ['favorite','oshi'].includes(c.preference));
    const saved=new Map((Array.isArray(stored.records)?stored.records:[])
      .filter(Boolean).map(c=>[String(c.id),c]));
    const order=Array.isArray(stored.order)?stored.order.map(String):[];
    const rows=chosen.map(c=>{
      const record=saved.get(String(c.id))||{};
      const work=gs.get(String(c.gameId))||{};
      return {...c,...record,displayName:record.displayName||record.name||c.nameCn||c.name||'',
        image:record.profileImage||record.image||record.landingImage||c.image||work.cover||'',
        fallbackImage:c.image||work.cover||'',charImage:c.image||'',
        gameName:record.game||work.name||''};
    }).sort((a,b)=>{
      const ia=order.indexOf(String(a.id)),ib=order.indexOf(String(b.id));
      return (ia<0?9999:ia)-(ib<0?9999:ib);
    });
    if(state.oshi.detail){
      const c=rows.find(r=>String(r.id)===String(state.oshi.detail));
      if(c){
        el.innerHTML='<div class="amv-native-detail">'+
          '<button type="button" class="amv-inline-back" data-amv="oshi-back">'+icon('back',18)+'好きな人たち</button>'+
          '<div class="amv-character-hero">'+art(c.image,c.displayName,'',c.fallbackImage)+'</div>'+
          '<span class="amv-eyebrow amv-detail-eyebrow">PORTRAITS OF AFFECTION</span>'+
          '<h1 class="amv-char-title">'+esc(c.displayName)+'</h1>'+
          '<p class="amv-char-subtitle">'+esc(c.gameName)+'</p>'+
          (c.review?'<section class="amv-detail-section"><span class="amv-eyebrow">WHY HIM</span>'+
            '<p class="amv-prose">'+esc(c.review)+'</p></section>':'')+
          '<div class="amv-detail-actions">'+actionButton('oshi-original-detail','ARTWORKS','heart','primary')+
          adminButton('oshi-edit','EDIT','edit','soft')+'</div></div>';
        hydrateImages(el);return;
      }
      state.oshi.detail='';
    }
    const cards=rows.map(c=>'<button type="button" class="amv-oshi-card" data-amv="open-oshi" data-id="'+esc(c.id)+'">'+
      '<div class="amv-oshi-picture">'+art(c.charImage||c.image,c.displayName,'',c.fallbackImage||c.image)+'</div>'+
      '<div><strong>'+esc(c.displayName)+'</strong><small>'+esc(c.gameName)+'</small></div>'+
      icon('arrow',18)+'</button>').join('');
    const allEdit=adminButton('oshi-manage','EDIT','edit','soft');
    el.innerHTML=heading('PORTRAITS OF AFFECTION','好きな人たち',quoteByView.oshi,allEdit)+
      '<div class="amv-oshi-feature"><span>MY OSHIS</span><h2>好きな人たち</h2>'+
      '<div class="amv-oshi-stats"><b>'+rows.length+'</b><span>PORTRAITS</span></div></div>'+
      (rows.length?'<div class="amv-oshi-list">'+cards+'</div>':empty('まだ誰もいません',''))+
      (isEditing()?'<button type="button" class="amv-export-row" data-amv="oshi-manage">'+
      '<span>'+icon('layers',18)+'<b>EDITORIAL LAYOUT</b></span>'+icon('arrow',18)+'</button>':'');
    hydrateImages(el);
  }
  async function hydrateImages(root){
    const imgs=Array.from(root.querySelectorAll('[data-amv-image]'));
    const resolve=async key=>{
      if(window.amoristImageStore?.isRef?.(key))return window.amoristImageStore.get(key).catch(()=>'');
      return key;
    };
    await Promise.all(imgs.map(async img=>{
      const primary=img.dataset.amvImage,backup=img.dataset.amvFallback||'';
      let triedBackup=false;
      const tryBackup=async()=>{
        if(triedBackup||!backup||!img.isConnected)return;
        triedBackup=true;
        const fallback=await resolve(backup);
        if(fallback&&img.isConnected)img.src=fallback;
      };
      img.addEventListener('error',tryBackup,{once:true});
      const url=await resolve(primary);
      if(url&&img.isConnected&&img.dataset.amvImage===primary)img.src=url;
      else await tryBackup();
    }));
  }
  function render(name){
    if(name==='home')renderHome();
    if(name==='library')renderLibrary();
    if(name==='characters')renderCharacters();
    if(name==='timeline')renderTimeline();
    if(name==='oshi')renderOshi();
  }
  function rerender(){render(state.route)}
  function syncRoute(){
    const next=$('.product-view.active')?.dataset.productView||'home';
    if(next!==state.route){
      const previous=state.route;
      state.route=next;
      // Clear detail state when LEAVING its section, not when ENTERING it.
      // A home shortcut can navigate and open a specific game in one action.
      if(previous==='library')state.lib.detail='';
      if(previous==='characters')state.chars.detail='';
      if(previous==='oshi'){state.oshi.detail='';state.oshi.advanced=false;}
      if(previous==='timeline')state.calendarAdvanced=false;
      if(previous==='home'){state.homePreview=false;state.homeAbout=false;}
      document.body.classList.remove('amv-legacy-game-detail','amv-legacy-timeline','amv-profile-preview','amv-legacy-oshi');
    }
    render(next);
  }
  function safeSaveGames(next){
    localStorage.setItem('amorist-game-library-v1',JSON.stringify(next.map(x=>model.normalizeGameRecord?.(x)||x)));
    window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{games:true}}));
  }
  function openSheet(title,choices,onSelect){
    draftDialog.replaceChildren();
    const content=document.createElement('div');content.className='amv-sheet-content';
    const headingEl=document.createElement('div');headingEl.className='amv-sheet-title';
    const titleEl=document.createElement('strong');titleEl.textContent=title;
    const close=document.createElement('button');close.type='button';close.textContent='关闭';close.onclick=()=>draftDialog.close();
    headingEl.append(titleEl,close);content.append(headingEl);
    for(const row of choices){
      const button=document.createElement('button');button.className='amv-sheet-option';button.type='button';
      button.textContent=row.label;button.onclick=()=>{draftDialog.close();onSelect(row.value)};
      content.append(button);
    }
    draftDialog.append(content);
    if(!draftDialog.open)draftDialog.showModal();
  }
  function editCharacter(id){
    const record=chars().find(x=>String(x.id)===String(id));
    if(!record)return;
    const search=$('#charSearchInput');
    const roleAll=$('#charRoleFilters [data-char-role-filter="all"]');
    roleAll?.click();
    const preferenceAll=$('#charPreferenceFilters [data-char-preference-filter="all"]');
    const excluded=$('#charPreferenceFilters [data-char-preference-filter="excluded"]');
    if(record.preference==='excluded')excluded?.click();else preferenceAll?.click();
    if(search){search.value=record.name||record.nameCn||'';search.dispatchEvent(new Event('input',{bubbles:true}));}
    const target=$$('#characterGrid .char-card').find(n=>String(n.dataset.charId)===String(id));
    if(target){const edit=target.querySelector('[data-char-action="edit"]');(edit||target).click();}
    else {
      // Direct fallback: original character grid can filter data by linked game status.
      const allButton=$('#charRoleFilters [data-char-role-filter="all"]');
      allButton?.click();if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
      const second=$$('#characterGrid .char-card').find(n=>String(n.dataset.charId)===String(id));
      if(second)(second.querySelector('[data-char-action="edit"]')||second).click();
      else toast('该角色暂时无法从原编辑器打开，可在高级图鉴中核实关联状态。');
    }
  }
  function openLegacyGame(id){
    state.lib.detail=String(id);document.body.classList.add('amv-legacy-game-detail');
    window.AmoristGameStore?.renderGameDetail?.(id);
    renderLibrary();
  }
  function nativeUpdateBulk(field){
    if(!isEditing())return;
    if(!state.lib.selected.size){toast('请先选择游戏');return}
    const selected=state.lib.selected;
    if(field==='delete'){
      if(!confirm('确定删除选中的 '+selected.size+' 部游戏吗？此操作会同步到本地档案。'))return;
      safeSaveGames(games().filter(g=>!selected.has(String(g.id))));state.lib.selected.clear();
      state.lib.manage=false;renderLibrary();return;
    }
    const choices=field==='status'?filterStatus.slice(1).map(x=>({value:x,label:x})):
      categories.map(x=>({value:x.id,label:x.label}));
    openSheet(field==='status'?'批量设置游玩状态':'批量设置喜好分类',choices,value=>{
      safeSaveGames(games().map(g=>selected.has(String(g.id))?{...g,[field==='status'?'status':'category']:value,updatedAt:Date.now()}:g));
      state.lib.selected.clear();state.lib.manage=false;renderLibrary();toast('已更新选中的游戏');
    });
  }
  function handleAction(target){
    const id=target.dataset.id||'',value=target.dataset.value||'';
    switch(target.dataset.amv){
      case 'new-game': if(isEditing())window.openEnhancedGameDialog?.(null);break;
      case 'new-char':if(isEditing())$('#addCharButton')?.click();break;
      case 'new-session':if(isEditing())window.openTimelineSessionDialog?.();break;
      case 'nav-library':go('library');break;
      case 'nav-timeline':go('timeline');break;
      case 'nav-oshi':go('oshi');break;
      case 'nav-studio':go('studio');break;
      case 'edit-profile':if(isEditing())$('#profileEditButton')?.click();break;
      case 'view-profile':state.homeAbout=true;renderHome();window.scrollTo({top:0,behavior:'auto'});break;
      case 'close-about':state.homeAbout=false;renderHome();window.scrollTo({top:0,behavior:'auto'});break;
      case 'preview-profile':
        state.homePreview=true;document.body.classList.add('amv-profile-preview');
        renderHome();window.scrollTo({top:0,behavior:'instant'});break;
      case 'close-profile-preview':
        state.homePreview=false;document.body.classList.remove('amv-profile-preview');renderHome();break;
      case 'home-game':go('library');state.lib.detail=id;renderLibrary();break;
      case 'lib-status':state.lib.status=value;renderLibrary();break;
      case 'lib-layout':state.lib.layout=value;renderLibrary();break;
      case 'lib-manage':if(!isEditing())return;state.lib.manage=!state.lib.manage;state.lib.selected.clear();renderLibrary();break;
      case 'open-game':
        if(state.lib.manage){state.lib.selected.has(id)?state.lib.selected.delete(id):state.lib.selected.add(id);renderLibrary();}
        else {state.lib.detail=id;renderLibrary();window.scrollTo({top:0,behavior:'auto'});}
        break;
      case 'back-games':state.lib.detail='';document.body.classList.remove('amv-legacy-game-detail');renderLibrary();break;
      case 'edit-game':if(isEditing())window.openEnhancedGameDialog?.(games().find(g=>String(g.id)===String(state.lib.detail))||null);break;
      case 'game-repo':{
        const game=games().find(g=>String(g.id)===String(state.lib.detail));
        if(game)window.amoristRepoManager?.open?.(game);
        break;
      }
      case 'advanced-game':openLegacyGame(state.lib.detail);break;
      case 'bulk-status':nativeUpdateBulk('status');break;
      case 'bulk-category':nativeUpdateBulk('category');break;
      case 'bulk-delete':nativeUpdateBulk('delete');break;
      case 'char-role':state.chars.role=value;renderCharacters();break;
      case 'char-preference':state.chars.preference=value;renderCharacters();break;
      case 'open-char':state.chars.detail=id;renderCharacters();window.scrollTo({top:0,behavior:'auto'});break;
      case 'back-chars':state.chars.detail='';renderCharacters();break;
      case 'edit-char':if(isEditing())editCharacter(state.chars.detail);break;
      case 'char-original':{
        const c=chars().find(c=>String(c.id)===String(state.chars.detail));
        if(c?.bangumiCharacterId)window.dispatchEvent(new CustomEvent('amorist-open-character',{detail:c.bangumiCharacterId}));
        break;
      }
      case 'char-game':go('library');state.lib.detail=id;renderLibrary();break;
      case 'timeline-mode':state.timeline.mode=value;renderTimeline();break;
      case 'month-prev':state.timeline.month=monthShift(state.timeline.month,-1);state.timeline.day='';renderTimeline();break;
      case 'month-next':state.timeline.month=monthShift(state.timeline.month,1);state.timeline.day='';renderTimeline();break;
      case 'month-today':state.timeline.month=new Date().toISOString().slice(0,7);state.timeline.day='';renderTimeline();break;
      case 'pick-day':state.timeline.day=state.timeline.day===value?'':value;renderTimeline();break;
      case 'event-open':{
        const e=events().find(x=>String(x.id||'')===String(id));
        if(e?.type==='session')window.openTimelineSessionDialog?.(e);
        else if(e?.gameId){go('library');state.lib.detail=String(e.gameId);renderLibrary();}
        break;
      }
      case 'timeline-advanced':
        state.calendarAdvanced=true;document.body.classList.add('amv-legacy-timeline');
        renderTimeline();window.scrollTo({top:0,behavior:'auto'});break;
      case 'timeline-back':
        state.calendarAdvanced=false;document.body.classList.remove('amv-legacy-timeline');renderTimeline();break;
      case 'open-oshi':showOriginalOshi(id);break;
      case 'oshi-back':closeOshiAdvanced();break;
      case 'oshi-manage':{
        if(!isEditing())return;
        window.amoristOshiOpenHub?.();
        state.oshi.advanced=true;document.body.classList.add('amv-legacy-oshi');
        renderOshi();
        $('#oshiEditButton')?.click();break;
      }
      case 'oshi-original-detail':showOriginalOshi(state.oshi.detail);break;
      case 'oshi-edit':if(isEditing())showOriginalOshi(state.oshi.detail,true);break;
    }
  }
  document.addEventListener('click',e=>{
    const tab=e.target.closest('.am-bottom-tabs [data-product-target]');
    if(!tab||tab.dataset.productTarget!==state.route)return;
    if(state.route==='library'&&state.lib.detail){
      state.lib.detail='';document.body.classList.remove('amv-legacy-game-detail');
      renderLibrary();window.scrollTo({top:0,behavior:'auto'});
    }
    if(state.route==='characters'&&state.chars.detail){
      state.chars.detail='';renderCharacters();window.scrollTo({top:0,behavior:'auto'});
    }
  },true);
  document.addEventListener('click',e=>{
    const back=e.target.closest('#amBackBtn,.game-detail-back');
    if(!back)return;
    if(document.body.classList.contains('amv-legacy-game-detail')){
      document.body.classList.remove('amv-legacy-game-detail');
      state.lib.detail='';
      setTimeout(renderLibrary,0);
      return;
    }
    if(state.route==='library'&&state.lib.detail){
      e.preventDefault();e.stopImmediatePropagation();
      state.lib.detail='';renderLibrary();return;
    }
    if(state.route==='characters'&&state.chars.detail){
      e.preventDefault();e.stopImmediatePropagation();
      state.chars.detail='';renderCharacters();return;
    }
    if(state.route==='oshi'&&state.oshi.detail&&!state.oshi.advanced){
      e.preventDefault();e.stopImmediatePropagation();
      state.oshi.detail='';renderOshi();return;
    }
  },true);
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-amv]');
    if(!btn||!btn.closest('.amv-screen'))return;
    e.preventDefault();handleAction(btn);
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='amvLibrarySearch'){
      state.lib.query=e.target.value;
      const cursor=e.target.selectionStart;
      renderLibrary();
      const next=$('#amvLibrarySearch');
      if(next){next.focus();try{next.setSelectionRange(cursor,cursor)}catch(_){}}
    }else if(e.target.id==='amvCharSearch'){
      state.chars.query=e.target.value;
      const cursor=e.target.selectionStart;renderCharacters();
      const next=$('#amvCharSearch');if(next){next.focus();try{next.setSelectionRange(cursor,cursor)}catch(_){}}
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='amvSort'){state.lib.sort=e.target.value;renderLibrary();}
  });
  const previousSet=Storage.prototype.setItem;let refreshTimer=0;
  Storage.prototype.setItem=function(key,value){
    const result=previousSet.call(this,key,value);
    if(this===window.localStorage&&/^(amorist-(?:game-library|character-book|profile|timeline-events|oshi-hub)-v1)$/.test(String(key))){
      clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>render(state.route),120);
    }
    return result;
  };
  window.addEventListener('amorist-data-changed',()=>{
    clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>render(state.route),120);
  });
  window.addEventListener('storage',()=>render(state.route));
  const main=$('.product-main');
  // The existing router toggles classes on each view; observe those only.
  // Observe direct view class switches only, not each editor input mutation.
  $$('.product-view').forEach(section=>new MutationObserver(()=>{
    if(section.classList.contains('active')&&section.dataset.productView!==state.route)syncRoute();
  }).observe(section,{attributes:true,attributeFilter:['class']}));
  state.route=$('.product-view.active')?.dataset.productView||'home';
  document.body.classList.add('amv-ready');
  VIEWS.forEach(render);
  window.AmoristMobileOshi={closeAdvanced:closeOshiAdvanced,openDetail:showOriginalOshi};
  window.AmoristNativeMobile={state,render,syncRoute};
  console.info('[Amorist] native mobile presentation v3 mounted without altering export canvas');
})();