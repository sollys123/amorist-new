(() => {
  'use strict';

  const KEY = 'amorist-oshi-hub-v1';
  const STATE_VERSION = 4;
  const CONTENT_VERSION = 3;
  const UI_ROUTE_KEY = 'amoristUi.oshiRoute.v1';
  const UI_MODE_KEY = 'amoristUi.oshiViewMode.v1';
  const CHAR_KEY = 'amorist-character-book-v1';
  const GAME_KEY = 'amorist-game-library-v1';
  const isEditor = window.AMORIST_MODE === 'editor';
  const AUTO_LAYOUT = true;
  const $ = id => document.getElementById(id);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const parse = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key) || ''); return value ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const toast = message => { const node = $('toast'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2200); };
  const initial = name => [...String(name || '?').trim()][0] || '?';
  const defaultLayouts = [
    {x:4,y:12,w:27,z:4,caption:'bottom'}, {x:40,y:7,w:17,z:6,caption:'right'},
    {x:71,y:14,w:22,z:3,caption:'bottom'}, {x:34,y:49,w:25,z:7,caption:'bottom'},
    {x:73,y:58,w:16,z:8,caption:'left'}, {x:7,y:69,w:19,z:2,caption:'bottom'}
  ];
  const blankState = {version:STATE_VERSION,records:[],order:[],visualOrder:[],defaultFocusId:'',viewMode:'flow'};
  let state = parse(KEY, blankState);
  if (Array.isArray(state)) state = {version:1,records:state};
  if (!state || typeof state !== 'object') state = {...blankState};
  if (!Array.isArray(state.records)) state.records = Array.isArray(state.characters) ? state.characters : [];
  let activeId = '';
  let hubEditing = false;
  let hubSelected = 0;
  let hubFocusId = String(state.defaultFocusId || '');
  let hubViewMode = (localStorage.getItem(UI_MODE_KEY)||state.viewMode) === 'magazine' ? 'magazine' : 'flow';
  let drag = null;
  let magazinePreviewToken = 0;
  let profilePreviewToken = 0;
  let detailImageToken = 0;
  let collectionDrag = null;
  let imageDrag = null;

  const dataModel = window.AmoristDataModel;
  function games() { const rows = parse(GAME_KEY, []); return Array.isArray(rows) ? rows.map(dataModel.normalizeGameRecord) : []; }
  function characters() { const rows = parse(CHAR_KEY, []); const gameRows=games(); return Array.isArray(rows) ? rows.filter(character=>character?.gameId||(!character?.animeId&&!Array.isArray(character?.animeIds))).map(character=>dataModel.normalizeCharacterRecord(character,gameRows)) : []; }
  function isOshiCharacter(character) {
    const preference=dataModel.normalizeCharacterPreference(character?.preference??character?.relation??character?.category);
    const roleType=dataModel.normalizeCharacterRoleType(character?.roleType);
    return roleType === 'route' && (preference === 'favorite' || preference === 'oshi');
  }
  function recordMap() { return new Map(state.records.filter(Boolean).map(record => [String(record.id), record])); }
  function workFor(character) {
    const game = games().find(row => String(row.id) === String(character.gameId) || String(row.bangumiId || '') === String(character.bangumiSubjectId || ''));
    return {game, name:game?.name || character.workTitle || character.game || '未关联作品'};
  }
  function characterInfoValue(value) {
    if(value==null)return '';
    if(Array.isArray(value))return value.map(characterInfoValue).filter(Boolean).join(' / ');
    if(typeof value==='object')return value.v||value.k||value.name||'';
    return String(value);
  }
  function importedFacts(character, gameName, cv) {
    const rows=[];
    if(gameName)rows.push({key:'游戏',value:gameName});
    if(cv)rows.push({key:'声优',value:cv});
    (Array.isArray(character?.infobox)?character.infobox:[]).forEach(row=>{
      const key=String(row?.key||'').trim(),value=characterInfoValue(row?.value).trim();
      if(!key||!value||/^(游戏|作品|声优|CV)$/i.test(key))return;
      rows.push({key,value});
    });
    const sources=rows.filter(row=>/引用来源|来源/i.test(row.key));
    const regular=rows.filter(row=>!sources.includes(row));
    const ages=regular.filter(row=>/年龄|年齢/i.test(row.key));
    const heights=regular.filter(row=>/身高|身長/i.test(row.key));
    const ordered=[];let inserted=false;
    regular.forEach(row=>{if(ages.includes(row))return;if(heights.includes(row)&&!inserted){ordered.push(...ages);inserted=true;}ordered.push(row);});
    if(!inserted)ordered.push(...ages);
    return [...ordered,...sources];
  }
  const clampPercent = value => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 50));
  const COLLECTION_TYPES = new Set(['auto','cg','artwork','archive']);
  const PROFILE_LAYOUTS = new Set(['auto','portrait','cinema','minimal']);
  const IMAGE_PRIORITIES = new Set(['feature','standard','support']);
  const IMAGE_FITS = new Set(['auto','original','contain','cover']);
  const COLLECTION_LAYOUTS = new Set(['auto','editorial','cinema','gallery','masonry','archive']);
  const LAYOUT_LABELS = {editorial:'Editorial Flow',cinema:'Cinema Sequence',gallery:'Gallery Spread',masonry:'Original Masonry',archive:'Archive Grid'};
  function inferCollectionType(group) {
    const text=`${group?.id||''} ${group?.title||''} ${group?.eyebrow||''}`.toLowerCase();
    if(/(^|\s|-)cg($|\s|-)|event|scene|剧情|スチル/.test(text))return 'cg';
    if(/art|work|illust|commission|画|绘|立绘/.test(text))return 'artwork';
    return 'archive';
  }
  function normalizeCollectionItem(item, groupId, index) {
    const source=item&&typeof item==='object'?item:{};
    return {
      ...source,
      id:String(source.id||source.uid||`${groupId}-image-${index+1}`),
      src:String(source.src||source.image||''),
      w:Number(source.w)||Number(source.width)||1000,
      h:Number(source.h)||Number(source.height)||1000,
      alt:String(source.alt||source.name||''),
      priority:IMAGE_PRIORITIES.has(source.priority)?source.priority:'standard',
      fit:source.fit==='cover'?'cover':(source.fit==='contain'||source.fit==='original'?'original':'auto'),
      focusX:clampPercent(source.focusX),
      focusY:clampPercent(source.focusY),
      hero:Boolean(source.hero||source.isHero),
      sceneCaption:String(source.sceneCaption||''),
    };
  }
  function normalizeCollection(group, index) {
    const source=group&&typeof group==='object'?group:{};
    const id=String(source.id||`set-${index+1}`);
    const items=(Array.isArray(source.items)?source.items:[]).map((item,itemIndex)=>normalizeCollectionItem(item,id,itemIndex));
    let heroSeen=false;
    items.forEach(item=>{if(item.hero&&!heroSeen)heroSeen=true;else if(item.hero)item.hero=false;});
    return {
      ...source,
      id,
      eyebrow:String(source.eyebrow||'COMMISSIONED WORKS'),
      title:String(source.title||'为他留下的画面'),
      type:COLLECTION_TYPES.has(source.type)?source.type:'auto',
      layoutMode:COLLECTION_LAYOUTS.has(source.layoutMode)?source.layoutMode:'auto',
      layoutVariant:Math.max(0,Number(source.layoutVariant)||0),
      quoteEnabled:Boolean(source.quoteEnabled),
      quoteText:String(source.quoteText||''),
      items,
    };
  }
  function normalizeCollections(groups) { return (Array.isArray(groups)?groups:[]).map(normalizeCollection); }
  function collectionPresentationType(group) { return group.type==='auto'?inferCollectionType(group):group.type; }
  function profilePresentation(entry, width=0, height=0) {
    if(PROFILE_LAYOUTS.has(entry.profileLayout)&&entry.profileLayout!=='auto')return entry.profileLayout;
    const ratio=Number(width)&&Number(height)?Number(width)/Number(height):0;
    if(ratio>=1.22)return 'cinema';
    if(ratio>0&&ratio<=.82)return 'portrait';
    return 'minimal';
  }
  function resolveImageSource(src) {
    if(!src)return Promise.resolve('');
    if(window.amoristImageStore?.isRef(src))return window.amoristImageStore.get(src).catch(()=> '');
    return Promise.resolve(src);
  }
  function entryFor(character, index) {
    const saved = recordMap().get(String(character.id)) || {};
    const work = workFor(character);
    const baseName = character.nameCn || character.name || '未命名角色';
    const layout = {...defaultLayouts[index % defaultLayouts.length], ...(saved.hubLayout || {})};
    const gameName=saved.game ?? work.name;
    const cv=saved.cv ?? character.cv ?? '';
    const profileImage=saved.profileImage ?? saved.image ?? character.image ?? '';
    return {
      ...character, ...saved, id:String(character.id),
      contentVersion:CONTENT_VERSION,
      displayName:saved.displayName ?? saved.name ?? baseName,
      name:saved.displayName ?? saved.name ?? baseName,
      alt:saved.alt || saved.subtitle || character.name || work.name,
      game:gameName,
      cv,
      since:saved.since ?? (character.updatedAt ? new Date(character.updatedAt).getFullYear() : ''),
      preference:dataModel.normalizeCharacterPreference(character.preference??character.relation??saved.preference??saved.relation),
      relation:dataModel.characterPreferenceLabel(character.preference??character.relation??saved.preference??saved.relation),
      image:profileImage,
      profileImage,
      landingImage:saved.landingImage || saved.overviewImage || saved.profileImage || saved.image || character.image || '',
      magazineFit:saved.magazineFit==='cover'?'cover':(saved.magazineFit==='contain'||saved.magazineFit==='original'?'original':'auto'),
      magazineX:Number.isFinite(Number(saved.magazineX))?Math.max(0,Math.min(100,Number(saved.magazineX))):50,
      magazineY:Number.isFinite(Number(saved.magazineY))?Math.max(0,Math.min(100,Number(saved.magazineY))):50,
      short:saved.short ?? saved.note ?? character.note ?? '',
      review:saved.review ?? character.summary ?? '',
      tags:Array.isArray(saved.tags) ? saved.tags : [],
      issueLabel:saved.issueLabel ?? `ISSUE ${String(index+1).padStart(2,'0')} / ${dataModel.characterPreferenceLabel(character.preference??character.relation??saved.preference??saved.relation)}`, 
      voiceLabel:saved.voiceLabel ?? 'VOICE',
      fromLabel:saved.fromLabel ?? 'FROM',
      sinceLabel:saved.sinceLabel ?? 'FIRST MET',
      reasonEyebrow:saved.reasonEyebrow ?? 'WHY HIM',
      reasonTitle:saved.reasonTitle ?? '偏爱的理由',
      factsEyebrow:saved.factsEyebrow ?? 'PROFILE',
      factsTitle:saved.factsTitle ?? '资料',
      imageCredit:saved.imageCredit ?? (profileImage?`角色资料卡 · ${gameName||baseName}`:''),
      facts:Array.isArray(saved.facts)?saved.facts.map(row=>({key:String(row?.key||''),value:String(row?.value||'')})):importedFacts(character,gameName,cv),
      profileLayout:PROFILE_LAYOUTS.has(saved.profileLayout)?saved.profileLayout:'auto',
      profileFit:saved.profileFit==='cover'?'cover':(saved.profileFit==='contain'||saved.profileFit==='original'?'original':'auto'),
      profileX:clampPercent(saved.profileX),
      profileY:clampPercent(saved.profileY),
      collections:normalizeCollections(saved.collections),
      hubLayout:layout,
      source:character,
      sourceIndex:index,
      workId:work.game?.id || character.gameId || character.bangumiSubjectId || ''
    };
  }
  function entries() {
    const rows=characters().filter(isOshiCharacter).map(entryFor);
    const order=Array.isArray(state.order)?state.order.map(String):[];
    return rows.sort((a,b)=>{
      const ai=order.indexOf(String(a.id)),bi=order.indexOf(String(b.id));
      if(ai<0&&bi<0)return 0;
      if(ai<0)return 1;
      if(bi<0)return -1;
      return ai-bi;
    });
  }
  function visualEntries() {
    const order=Array.isArray(state.visualOrder)?state.visualOrder.map(String):[];
    return [...entries()].sort((a,b)=>{
      const ai=order.indexOf(String(a.id)),bi=order.indexOf(String(b.id));
      if(ai<0&&bi<0)return (a.sourceIndex??0)-(b.sourceIndex??0);
      if(ai<0)return 1;if(bi<0)return -1;return ai-bi;
    });
  }
  function savedRecord(entry) {
    const keep = ['id','contentVersion','displayName','alt','short','review','tags','profileImage','profileLayout','profileFit','profileX','profileY','landingImage','magazineFit','magazineX','magazineY','hubLayout','collections','game','cv','since','issueLabel','voiceLabel','fromLabel','sinceLabel','reasonEyebrow','reasonTitle','factsEyebrow','factsTitle','imageCredit','facts'];
    const record = {id:String(entry.id)};
    keep.forEach(key => { if (entry[key] !== undefined) record[key] = entry[key]; });
    return record;
  }
  function statePayload(){return {version:STATE_VERSION,records:state.records,order:Array.isArray(state.order)?state.order:[],visualOrder:Array.isArray(state.visualOrder)?state.visualOrder:[],defaultFocusId:String(state.defaultFocusId||''),viewMode:hubViewMode,updatedAt:Date.now()};}
  function saveState(){write(KEY,statePayload());}
  function snapshotImportedContentOnce(){
    const map=recordMap(),rows=entries(),visualRows=[...rows].sort((a,b)=>(a.sourceIndex??0)-(b.sourceIndex??0));let changed=false;
    rows.forEach(entry=>{const record=map.get(String(entry.id));if(Number(record?.contentVersion)===CONTENT_VERSION)return;state.records=[...state.records.filter(row=>String(row?.id)!==String(entry.id)),savedRecord(entry)];changed=true;});
    if(!Array.isArray(state.visualOrder)||!state.visualOrder.length){state.visualOrder=visualRows.map(row=>String(row.id));changed=true;}
    if(!state.defaultFocusId&&visualRows.length){state.defaultFocusId=String(visualRows[0].id);hubFocusId=state.defaultFocusId;changed=true;}
    if(changed)saveState();
  }
  function persist() {
    const current = entries().map(savedRecord);
    const known = new Set(current.map(row => String(row.id)));
    state.records = [...current, ...state.records.filter(row => row && !known.has(String(row.id)))];
    state.order=entries().map(entry=>String(entry.id));
    state.visualOrder=visualEntries().map(entry=>String(entry.id));
    saveState();
    window.dispatchEvent(new CustomEvent('amorist-data-changed',{detail:{oshi:true}}));
  }
  function updateEntry(id, changes) {
    const rows = entries(); const entry = rows.find(row => String(row.id) === String(id));
    if (!entry) return null;
    Object.assign(entry, changes);
    state.records = [...state.records.filter(row => String(row.id) !== String(id)), savedRecord(entry)];
    saveState();
    return entry;
  }
  function readImage(file) { return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => resolve({src:reader.result,w:image.naturalWidth || 1000,h:image.naturalHeight || 1000,alt:file.name}); image.onerror = () => resolve({src:reader.result,w:1000,h:1000,alt:file.name}); image.src = reader.result; }; reader.readAsDataURL(file); }); }
  async function readImages(files) { return Promise.all([...files].map(readImage)); }
  function setImage(img, fallback, src, label, onLoad, isCurrent) {
    if(!img)return;
    if(fallback){fallback.textContent='';fallback.hidden=true;}
    // Clear the previous person's image synchronously. The new source may
    // resolve later, so the old bitmap must never remain visible meanwhile.
    img.hidden=true;img.removeAttribute('src');img.onload=null;img.onerror=null;
    if(!src)return;
    const apply=resolved=>{
      if(isCurrent&&!isCurrent())return;
      if(!resolved){img.hidden=true;return;}
      img.onload=()=>{
        if(isCurrent&&!isCurrent())return;
        if(fallback)fallback.hidden=true;img.hidden=false;
        const figure=img.closest('.oshi-figure');
        if(figure&&img.naturalWidth&&img.naturalHeight)figure.style.setProperty('--oshi-ratio',String(img.naturalWidth/img.naturalHeight));
        onLoad?.(img,resolved);
      };
      img.onerror=()=>{if(isCurrent&&!isCurrent())return;if(fallback)fallback.hidden=true;img.hidden=true;};
      img.src=resolved;
    };
    resolveImageSource(src).then(apply);
  }
  function hydrateOshiImages(root) {
    if(!root)return;
    root.querySelectorAll('[data-oshi-image-ref]').forEach(node=>{
      const ref=node.dataset.oshiImageRef;if(!ref)return;
      const host=node.closest('.oshi-gallery-item,.oshi-thumb,.oshi-figure')||node.parentElement;
      const clearError=()=>{host?.querySelector(':scope > .oshi-image-error')?.remove();};
      const fail=()=>{node.dataset.imageStatus='error';if(host&&!host.querySelector(':scope > .oshi-image-error')){const notice=document.createElement('span');notice.className='oshi-image-error';notice.textContent='图片读取失败';host.appendChild(notice);}};
      const apply=src=>{
        if(!src){fail();return;}
        clearError();node.dataset.imageStatus='loading';
        if(node.matches('img')){node.onload=()=>{node.dataset.imageStatus='ready';clearError();};node.onerror=fail;node.src=src;}
        else {node.style.backgroundImage=`url("${src.replace(/"/g,'%22')}")`;node.dataset.imageStatus='ready';}
      };
      resolveImageSource(ref).then(apply).catch(fail);
    });
  }
  function applyPosition(element, layout) { element.style.left = `${layout.x}%`; element.style.top = `${layout.y}%`; element.style.width = `${layout.w}%`; element.style.zIndex = layout.z; element.dataset.caption = layout.caption || 'bottom'; }
  function syncHubControls() {
    const entry = visualEntries()[hubSelected]; if (!entry) return;
    $('oshiHubCharacterSelect').value = String(entry.id); $('oshiWidth').value = entry.hubLayout.w; $('oshiWidthValue').textContent = `${Math.round(entry.hubLayout.w)}%`; $('oshiX').value = entry.hubLayout.x; $('oshiY').value = entry.hubLayout.y; $('oshiCaption').value = entry.hubLayout.caption || 'bottom';
    if($('oshiMagazineFit'))$('oshiMagazineFit').value=entry.magazineFit==='cover'?'cover':'original';
    if($('oshiMagazineX')){$('oshiMagazineX').value=entry.magazineX;$('oshiMagazineXValue').textContent=`${Math.round(entry.magazineX)}%`;}
    if($('oshiMagazineY')){$('oshiMagazineY').value=entry.magazineY;$('oshiMagazineYValue').textContent=`${Math.round(entry.magazineY)}%`;}
    syncMagazineFocusControls(entry);
    if($('oshiDefaultFocus'))$('oshiDefaultFocus').value=String(state.defaultFocusId||visualEntries()[0]?.id||'');
    if($('oshiMagazineSlot'))$('oshiMagazineSlot').value=String(Math.max(0,visualEntries().findIndex(row=>String(row.id)===String(entry.id))));
    updateMagazinePreview(entry);
  }
  function syncMagazineFocusControls(entry){$$('[data-oshi-magazine-focus]').forEach(node=>node.hidden=entry?.magazineFit!=='cover');}
  async function updateMagazinePreview(entry){
    const preview=$('oshiMagazinePreview'),image=$('oshiMagazinePreviewImage');if(!preview||!image||!entry)return;
    const token=++magazinePreviewToken;preview.dataset.status=entry.landingImage?'loading':'empty';preview.dataset.fit=entry.magazineFit==='cover'?'cover':'natural';image.hidden=true;image.removeAttribute('src');image.alt=`${entry.name} 杂志裁剪预览`;
    image.style.objectFit=entry.magazineFit==='cover'?'cover':'contain';image.style.objectPosition=`${entry.magazineX}% ${entry.magazineY}%`;
    preview.dataset.slot=String(Math.max(0,visualEntries().findIndex(row=>String(row.id)===String(entry.id))));
    if(!entry.landingImage)return;
    const resolved=await resolveImageSource(entry.landingImage);if(token!==magazinePreviewToken)return;
    if(!resolved){preview.dataset.status='error';return;}
    image.onload=()=>{if(token!==magazinePreviewToken)return;preview.dataset.status='ready';image.hidden=false;};
    image.onerror=()=>{if(token!==magazinePreviewToken)return;preview.dataset.status='error';image.hidden=true;};
    image.src=resolved;
  }
  function ensureMagazineControls(){
    if($('oshiMagazineFit'))return;const anchor=$('oshiHubImageUpload')?.closest('label');if(!anchor)return;
    const preview=document.createElement('figure');preview.className='oshi-magazine-crop-preview';preview.id='oshiMagazinePreview';preview.innerHTML='<img id="oshiMagazinePreviewImage" alt="杂志裁剪预览"><figcaption>MAGAZINE CROP PREVIEW</figcaption>';
    const focus=document.createElement('label');focus.innerHTML='<span>默认中心人物</span><select id="oshiDefaultFocus"></select>';
    const slot=document.createElement('label');slot.innerHTML='<span>默认排布位置</span><select id="oshiMagazineSlot"><option value="0">01 · 主视觉</option><option value="1">02 · 上方穿插</option><option value="2">03 · 右上</option><option value="3">04 · 下方穿插</option><option value="4">05 · 右下</option></select>';
    const fit=document.createElement('label');fit.innerHTML='杂志图片适配<select id="oshiMagazineFit"><option value="original">原图完整展示</option><option value="cover">铺满裁切</option></select>';
    const x=document.createElement('label');x.dataset.oshiMagazineFocus='';x.innerHTML='杂志裁剪横向焦点 <output id="oshiMagazineXValue">50%</output><input id="oshiMagazineX" type="range" min="0" max="100" step="1" value="50">';
    const y=document.createElement('label');y.dataset.oshiMagazineFocus='';y.innerHTML='杂志裁剪纵向焦点 <output id="oshiMagazineYValue">50%</output><input id="oshiMagazineY" type="range" min="0" max="100" step="1" value="50">';
    anchor.after(preview,focus,slot,fit,x,y);
  }
  function ensureHubChrome(){
    // Keep the view switch in the page header; moving it into the canvas hides it in the archive shell.
  }
  function populateMagazineControls(){
    const rows=visualEntries(),focus=$('oshiDefaultFocus'),slot=$('oshiMagazineSlot');if(!focus||!slot)return;
    focus.innerHTML=rows.map(row=>`<option value="${safe(row.id)}">${safe(row.name)}</option>`).join('');
    slot.innerHTML=rows.map((row,index)=>`<option value="${index}">${String(index+1).padStart(2,'0')} · ${index===0?'主视觉':index===1?'上方穿插':index===2?'右上':index===3?'下方穿插':index===4?'右下':'后续轮播'}</option>`).join('');
  }
  function setDefaultFocus(id){
    const rows=visualEntries(),index=rows.findIndex(row=>String(row.id)===String(id));if(index<0)return;
    const rotated=[...rows.slice(index),...rows.slice(0,index)];state.defaultFocusId=String(id);state.visualOrder=rotated.map(row=>String(row.id));hubFocusId=String(id);hubSelected=0;saveState();populateMagazineControls();renderHub();
  }
  function moveSelectedToMagazineSlot(position){
    const rows=visualEntries(),entry=rows[hubSelected];if(!entry)return;const target=Math.max(0,Math.min(rows.length-1,Number(position)||0));
    if(target===0){setDefaultFocus(entry.id);return;}
    const focusIndex=Math.max(0,rows.findIndex(row=>String(row.id)===String(state.defaultFocusId))),ordered=[...rows.slice(focusIndex),...rows.slice(0,focusIndex)];
    const next=ordered.filter(row=>String(row.id)!==String(entry.id));next.splice(Math.min(next.length,target),0,entry);
    state.visualOrder=next.map(row=>String(row.id));
    hubSelected=Math.max(0,next.findIndex(row=>String(row.id)===String(entry.id)));saveState();populateMagazineControls();renderHub();
  }
  function selectHubCharacter(index) { hubSelected = index; $$('#oshiCanvas .oshi-figure').forEach(node => node.classList.toggle('selected', Number(node.dataset.index) === index)); syncHubControls(); }
  function bindDrag(element, index) {
    if (AUTO_LAYOUT) return;
    element.addEventListener('pointerdown', event => { if (!hubEditing || event.target.closest('.oshi-resize')) return; event.preventDefault(); event.stopPropagation(); selectHubCharacter(index); element.setPointerCapture?.(event.pointerId); const box=$('oshiCanvas').getBoundingClientRect(), layout=entries()[index].hubLayout; drag={type:'move',index,startX:event.clientX,startY:event.clientY,x:layout.x,y:layout.y,box}; });
    element.querySelector('.oshi-resize')?.addEventListener('pointerdown', event => { if (!hubEditing) return; event.preventDefault(); event.stopPropagation(); selectHubCharacter(index); const box=$('oshiCanvas').getBoundingClientRect(), layout=entries()[index].hubLayout; drag={type:'resize',index,startX:event.clientX,w:layout.w,box}; });
  }
  document.addEventListener('pointermove', event => { if (!drag) return; event.preventDefault(); const rows=entries(), entry=rows[drag.index], node=$(`#oshiCanvas .oshi-figure[data-index="${drag.index}"]`); if (!entry || !node) return; const layout=entry.hubLayout; if (drag.type === 'move') { layout.x=Math.max(0,Math.min(100-layout.w,drag.x+(event.clientX-drag.startX)/drag.box.width*100)); const height=node.getBoundingClientRect().height/drag.box.height*100; layout.y=Math.max(2,Math.min(98-height,drag.y+(event.clientY-drag.startY)/drag.box.height*100)); } else { layout.w=Math.max(12,Math.min(42,drag.w+(event.clientX-drag.startX)/drag.box.width*100)); layout.x=Math.max(0,Math.min(100-layout.w,layout.x)); } applyPosition(node,layout); syncHubControls(); },{passive:false});
  document.addEventListener('pointerup', () => { if (drag) { persist(); drag=null; } });
  document.addEventListener('pointercancel', () => { if (drag) { persist(); drag=null; } });

  function updateHubStage(canvas, rows, focusIndex) {
    if (!rows.length) return;
    const total=rows.length;
    const visibleRange=hubViewMode==='magazine'?4:2;
    hubFocusId=String(rows[focusIndex]?.id || rows[0].id);
    canvas.querySelectorAll('.oshi-figure').forEach((figure,index) => {
      const forward=(index-focusIndex+total)%total;
      let offset=index-focusIndex;
      if (total>1) {
        if (offset>total/2) offset-=total;
        if (offset<-total/2) offset+=total;
      }
      const distance=Math.abs(offset);
      figure.style.setProperty('--oshi-offset',String(offset));
      figure.style.setProperty('--oshi-distance',String(distance));
      figure.dataset.magSlot=String(forward<=4?forward:-1);
      figure.style.zIndex=String(30-distance);
      figure.classList.toggle('is-active',offset===0);
      figure.classList.toggle('is-stage-hidden',distance>visibleRange);
      figure.setAttribute('aria-current',offset===0?'true':'false');
    });
    const counter=canvas.querySelector('.oshi-stage-counter');
    if(counter) counter.textContent=`${String(focusIndex+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
  }

  function renderHub() {
    const canvas=$('oshiCanvas'); if (!canvas) return;
    canvas.querySelectorAll('.oshi-magazine-stage,.oshi-figure,.oshi-empty,.oshi-stage-control,.oshi-stage-counter,.oshi-magazine-copy,.oshi-flow-copy').forEach(node => node.remove());
    const rows=visualEntries(), rankedRows=entries();
    const magazineStage=hubViewMode==='magazine'?Object.assign(document.createElement('div'),{className:'oshi-magazine-stage'}):canvas;
    $('oshiCount').textContent = String(rows.length).padStart(2,'0');
    if (!rows.length) {
      const empty=document.createElement('div');
      empty.className='oshi-empty';
      const title=document.createElement('strong');
      title.textContent=isEditor?'还没有推角人物':'人物档案正在整理中';
      const message=document.createElement('span');
      message.textContent=isEditor?'先在角色图鉴中添加人物，再回来编排这本只属于你的推角册。':'暂时还没有公开的人物档案，请稍后再来看看。';
      empty.append(title,message);
      if(isEditor){
        const action=document.createElement('button');
        action.className='product-button rose';
        action.type='button';
        action.textContent='前往角色图鉴';
        action.addEventListener('click',()=>window.amoristProductNavigate?.('characters'));
        empty.appendChild(action);
      }
      canvas.appendChild(empty);
    }
    rows.forEach((entry,index) => {
      const figure=document.createElement('button'); figure.className='oshi-figure'; figure.type='button'; figure.dataset.index=index; figure.dataset.oshiId=String(entry.id); figure.dataset.fit=entry.magazineFit==='cover'?'cover':'natural'; figure.setAttribute('aria-label',`打开 ${entry.name}`); figure.style.setProperty('--oshi-mag-fit',entry.magazineFit==='cover'?'cover':'contain');figure.style.setProperty('--oshi-mag-x',`${entry.magazineX}%`);figure.style.setProperty('--oshi-mag-y',`${entry.magazineY}%`);
      const wash=document.createElement('span'); wash.className='oshi-magazine-wash'; if(entry.landingImage)wash.dataset.oshiImageRef=entry.landingImage;
      const media=document.createElement('span'); media.className='oshi-figure-media'; const fallback=document.createElement('span'); fallback.className='oshi-fallback'; const image=document.createElement('img'); image.alt=`${entry.name} 总览图片`; setImage(image,fallback,entry.landingImage,entry.name); media.append(fallback,image);
      const badge=document.createElement('span'); badge.className='oshi-edit-badge'; badge.textContent=String(index+1).padStart(2,'0'); const resize=document.createElement('span'); resize.className='oshi-resize'; const caption=document.createElement('span'); caption.className='oshi-caption'; caption.innerHTML=`<small>${String(index+1).padStart(2,'0')}</small><strong>${safe(entry.name)}</strong><span>${safe(entry.game)}</span>`; figure.append(wash,media,badge,resize,caption);
      figure.addEventListener('click',event => {
        if (hubEditing) { event.preventDefault(); event.stopPropagation(); selectHubCharacter(index); return; }
        if (hubViewMode==='magazine') { openDetail(entry.id); return; }
        if (!figure.classList.contains('is-active')) { event.preventDefault(); event.stopPropagation(); updateHubStage(canvas,rows,index); return; }
        openDetail(entry.id);
      });
      bindDrag(figure,index); magazineStage.appendChild(figure);
    });
    if(magazineStage!==canvas)canvas.appendChild(magazineStage);
    if(rows.length>1) {
      const previous=document.createElement('button'); previous.className='oshi-stage-control is-previous'; previous.type='button'; previous.setAttribute('aria-label','上一个角色'); previous.textContent='←';
      const next=document.createElement('button'); next.className='oshi-stage-control is-next'; next.type='button'; next.setAttribute('aria-label','下一个角色'); next.textContent='→';
      const counter=document.createElement('span'); counter.className='oshi-stage-counter';
      const move=step => { const current=Math.max(0,rows.findIndex(row=>String(row.id)===String(hubFocusId))); updateHubStage(canvas,rows,(current+step+rows.length)%rows.length); };
      previous.addEventListener('click',()=>move(-1)); next.addEventListener('click',()=>move(1)); canvas.append(previous,next,counter);
    }
    if(hubViewMode==='magazine' && rows.length){
      const bestCount=rows.filter(entry=>dataModel.normalizeCharacterPreference(entry.preference??entry.relation)==='favorite').length;
      const copy=document.createElement('aside'); copy.className='oshi-magazine-copy';
      copy.innerHTML=`<span>PORTRAITS OF AFFECTION</span><h2>好きな人<br>たち</h2><strong>THE ONES I KEEP RETURNING TO</strong><p>不是排序，也不是名单。<br>只是一些反复回到眼前的人。</p><dl><div><dt>ALL</dt><dd>${String(rows.length).padStart(2,'0')}</dd></div><div><dt>MOST BELOVED</dt><dd>${String(bestCount).padStart(2,'0')}</dd></div><div><dt>BELOVED</dt><dd>${String(Math.max(0,rows.length-bestCount)).padStart(2,'0')}</dd></div></dl>`;
      canvas.prepend(copy);
    }
    if(hubViewMode==='flow' && rows.length){
      const copy=document.createElement('aside');copy.className='oshi-flow-copy';copy.innerHTML='<span>PORTRAITS OF AFFECTION</span><h2>好きな人たち</h2>';canvas.prepend(copy);
    }
    canvas.classList.toggle('editing',hubEditing); canvas.classList.toggle('oshi-auto-layout',AUTO_LAYOUT); canvas.classList.toggle('oshi-magazine-layout',hubViewMode==='magazine');
    $$('[data-oshi-view-mode]').forEach(button=>{const active=button.dataset.oshiViewMode===hubViewMode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const initialFocus=Math.max(0,rows.findIndex(row=>String(row.id)===String(hubFocusId)));
    updateHubStage(canvas,rows,initialFocus); hydrateOshiImages(canvas);
    $('oshiHelp').hidden=!hubEditing; $('oshiEditButton').textContent=hubEditing?'完成':'编辑图片';
    const list=$('oshiIndexList'); list.innerHTML=''; rankedRows.forEach((entry,index) => { const button=document.createElement('button'); button.className='oshi-index-link'; button.type='button'; button.innerHTML=`<small>${String(index+1).padStart(2,'0')}</small><span class="oshi-index-copy"><strong>${safe(entry.name)}</strong><em>${safe(entry.game)}</em></span>`; button.addEventListener('click',() => openDetail(entry.id)); list.appendChild(button); });
    requestAnimationFrame(() => selectHubCharacter(Math.min(hubSelected,Math.max(0,rows.length-1))));
  }
  function renderTabs(entry) { const box=$('oshiDetailTabs'); box.innerHTML=''; entries().forEach(row => { const button=document.createElement('button'); button.type='button'; button.textContent=`${row.name}`; button.className=String(row.id)===String(entry.id)?'active':''; button.addEventListener('click',() => openDetail(row.id)); box.appendChild(button); }); }
  function characterFacts(entry) {
    return Array.isArray(entry.facts)?entry.facts.filter(row=>String(row?.key||'').trim()||String(row?.value||'').trim()):[];
  }
  function collectionChunkSizes(total){
    if(total<=5)return total?[total]:[];
    const groups=Math.ceil(total/5);
    const sizes=Array(groups).fill(Math.floor(total/groups));
    let remainder=total-sizes.reduce((sum,value)=>sum+value,0);
    for(let index=0;remainder>0;index=(index+1)%sizes.length){if(sizes[index]<5){sizes[index]+=1;remainder-=1;}}
    return sizes;
  }
  function collectionChunks(items){
    const chunks=[];let cursor=0;
    collectionChunkSizes(items.length).forEach(size=>{chunks.push(items.slice(cursor,cursor+size));cursor+=size;});
    return chunks;
  }
  function itemRatio(item){return Math.max(.2,Math.min(5,(Number(item?.w)||4)/(Number(item?.h)||3)));}
  function chooseChunkHero(chunk,type){
    const explicit=chunk.findIndex(item=>item.hero);if(explicit>=0)return explicit;
    const featured=chunk.findIndex(item=>item.priority==='feature');if(featured>=0)return featured;
    let best=0,bestScore=-Infinity;
    chunk.forEach((item,index)=>{
      const ratio=itemRatio(item),area=(Number(item.w)||1)*(Number(item.h)||1);
      let score=Math.log(Math.max(1,area));
      if(type==='cg')score+=ratio>=1.25?6:ratio;
      else if(type==='artwork')score+=ratio<=.9?6:1/ratio;
      else score+=Math.abs(ratio-1)<.3?3:1;
      if(item.priority==='support')score-=4;
      if(score>bestScore){bestScore=score;best=index;}
    });
    return best;
  }
  function galleryRoles(chunk,heroIndex){
    const roles=Array(chunk.length);roles[heroIndex]='hero';
    const rank={feature:0,standard:1,support:2};
    chunk.map((item,index)=>({item,index})).filter(row=>row.index!==heroIndex).sort((a,b)=>(rank[a.item.priority]??1)-(rank[b.item.priority]??1)||a.index-b.index).forEach((row,slot)=>{roles[row.index]=String.fromCharCode(97+slot);});
    return roles;
  }
  function effectiveImageFit(item){return item?.fit==='cover'?'cover':'natural';}
  function priorityWeight(item){
    if(item?.hero)return 1.6;
    if(item?.priority==='feature')return 1.35;
    if(item?.priority==='support')return .72;
    return 1;
  }
  function collectionLayoutCandidates(group){
    const items=Array.isArray(group?.items)?group.items:[],type=collectionPresentationType(group),count=items.length;
    const ratios=items.map(itemRatio),landscape=ratios.filter(value=>value>=1.18).length,portrait=ratios.filter(value=>value<=.84).length;
    let modes;
    if(type==='cg')modes=['cinema','editorial',...(count>=7?['archive']:[]),'masonry'];
    else if(type==='artwork')modes=['gallery','editorial','masonry',...(count>=7?['archive']:[])];
    else modes=['archive','masonry','editorial',...(portrait>landscape?['gallery']:[]),...(landscape>=Math.ceil(count*.65)?['cinema']:[])];
    if(count<=2)modes=modes.filter(mode=>mode!=='archive'||count===2);
    return [...new Set(modes.length?modes:['editorial'])];
  }
  function resolvedCollectionLayout(group){
    const candidates=collectionLayoutCandidates(group),explicit=group?.layoutMode;
    if(explicit&&explicit!=='auto'&&candidates.includes(explicit))return explicit;
    return candidates[(Math.max(0,Number(group?.layoutVariant)||0))%candidates.length];
  }
  function cropRatioFor(item,layout){
    if(layout==='cinema')return '16 / 9';
    if(layout==='gallery')return itemRatio(item)<.9?'4 / 5':'4 / 3';
    if(layout==='archive')return itemRatio(item)<.8?'3 / 4':'4 / 3';
    return itemRatio(item)>=1.2?'3 / 2':'4 / 5';
  }
  function renderGalleryItem(item,type,role,index,total,layout='editorial'){
    const figure=document.createElement('figure'),fit=effectiveImageFit(item);figure.className=`oshi-gallery-item is-${item.priority||'standard'}${item.hero?' is-explicit-hero':''}`;figure.dataset.galleryRole=role||'';figure.dataset.fit=fit;figure.style.setProperty('--art-ratio',String(itemRatio(item)));figure.style.setProperty('--oshi-crop-ratio',cropRatioFor(item,layout));figure.style.setProperty('--oshi-item-x',`${clampPercent(item.focusX)}%`);figure.style.setProperty('--oshi-item-y',`${clampPercent(item.focusY)}%`);
    const button=document.createElement('button');button.type='button';button.className='oshi-gallery-image-button';button.setAttribute('aria-label',`查看图片 ${index+1} / ${total}`);
    const img=document.createElement('img');img.dataset.oshiImageRef=item.src||'';img.alt='';img.loading='lazy';if(Number(item.w)>0)img.width=Number(item.w);if(Number(item.h)>0)img.height=Number(item.h);button.appendChild(img);button.addEventListener('click',async()=>openLightbox(await resolveImageSource(item.src)));
    figure.appendChild(button);
    if(type==='cg'&&String(item.sceneCaption||'').trim()){
      const caption=document.createElement('figcaption');caption.innerHTML=`<span>${String(index+1).padStart(2,'0')}</span><p>${safe(item.sceneCaption)}</p>`;figure.appendChild(caption);
    }
    return figure;
  }
  function splitNaturalSegments(items){
    const segments=[];let cursor=0;
    while(cursor<items.length){
      const left=items.length-cursor;let size=left<=3?left:3;
      const first=items[cursor];
      if(left>=5&&(first?.hero||first?.priority==='feature')&&(itemRatio(first)>=1.65||itemRatio(first)<=.62))size=1;
      if(left-size===1&&size>2)size-=1;
      segments.push(items.slice(cursor,cursor+size));cursor+=size;
    }
    return segments;
  }
  function naturalWidth(item,layout){
    const ratio=itemRatio(item);
    let width=ratio>=1.55?92:ratio<=.72?52:ratio<1?62:76;
    if(layout==='gallery')width=ratio<=.9?Math.min(width,58):Math.min(88,width+5);
    if(item?.hero||item?.priority==='feature')width=Math.min(100,width+12);
    if(item?.priority==='support')width=Math.max(34,width-14);
    return Math.max(34,Math.min(100,width));
  }
  function renderEditorialLayout(gallery,items,type,layoutVariant){
    splitNaturalSegments(items).forEach((segment,segmentIndex)=>{
      const spread=document.createElement('div');spread.className=`oshi-natural-spread layout-editorial count-${segment.length} variant-${(layoutVariant+segmentIndex)%3}`;spread.dataset.spread=String(segmentIndex+1);
      const ratios=segment.map(itemRatio),portraitIndex=segment.length===3?ratios.findIndex(value=>value<=.82):-1;
      if(segment.length===3&&portraitIndex>=0&&ratios.filter(value=>value>=1.15).length>=1)spread.dataset.composition='portrait-stack';
      segment.forEach((item,index)=>{
        const role=item.hero?'hero':item.priority||'standard',figure=renderGalleryItem(item,type,role,items.indexOf(item),items.length,'editorial');
        figure.style.setProperty('--natural-width',`${naturalWidth(item,'editorial')}%`);figure.style.setProperty('--sequence',String(index));
        if(spread.dataset.composition==='portrait-stack')figure.dataset.stackRole=index===portraitIndex?'portrait':(index<portraitIndex?'before':'after');
        spread.appendChild(figure);
      });gallery.appendChild(spread);
    });
  }
  function justifiedRows(items,target=2.8,maxItems=3){
    const rows=[];let row=[],sum=0;
    items.forEach(item=>{const ratio=itemRatio(item);if(item.hero&&row.length){rows.push(row);row=[];sum=0;}if(item.hero){rows.push([item]);return;}row.push(item);sum+=ratio;if(row.length>=maxItems||sum>=target){rows.push(row);row=[];sum=0;}});if(row.length)rows.push(row);
    if(rows.length>1&&rows.at(-1).length===1&&rows.at(-2).length>=3)rows.at(-1).unshift(rows.at(-2).pop());
    return rows;
  }
  function renderJustifiedLayout(gallery,items,type,layout,variant){
    const target=layout==='archive'?3.8:2.65,max=layout==='archive'?4:3,rows=justifiedRows(items,target,max);
    rows.forEach((row,rowIndex)=>{
      const spread=document.createElement('div');spread.className=`oshi-justified-row layout-${layout} variant-${(variant+rowIndex)%3}`;spread.dataset.last=String(rowIndex===rows.length-1);
      const sum=row.reduce((total,item)=>total+itemRatio(item)*priorityWeight(item),0);
      row.forEach(item=>{const weighted=itemRatio(item)*priorityWeight(item),figure=renderGalleryItem(item,type,item.hero?'hero':item.priority,items.indexOf(item),items.length,layout);figure.style.setProperty('--row-share',`${(weighted/sum*100).toFixed(4)}%`);spread.appendChild(figure);});gallery.appendChild(spread);
    });
  }
  function renderGalleryLayout(gallery,items,type,variant){
    let cursor=0,block=0;
    while(cursor<items.length){const item=items[cursor],solo=item.hero||item.priority==='feature'||itemRatio(item)<=.72||itemRatio(item)>=1.75||cursor===items.length-1;const chunk=solo?[item]:items.slice(cursor,cursor+2);const spread=document.createElement('div');spread.className=`oshi-gallery-passage count-${chunk.length} variant-${(variant+block)%3}`;chunk.forEach((row,index)=>{const figure=renderGalleryItem(row,type,row.hero?'hero':row.priority,items.indexOf(row),items.length,'gallery');figure.style.setProperty('--natural-width',`${naturalWidth(row,'gallery')}%`);figure.style.setProperty('--sequence',String(index));spread.appendChild(figure);});gallery.appendChild(spread);cursor+=chunk.length;block++;}
  }
  function renderMasonryLayout(gallery,items,type){const spread=document.createElement('div');spread.className='oshi-original-masonry';items.forEach(item=>spread.appendChild(renderGalleryItem(item,type,item.hero?'hero':item.priority,items.indexOf(item),items.length,'masonry')));gallery.appendChild(spread);}
  function renderCollections(entry) {
    const host=$('oshiCollections'); host.innerHTML='';
    (entry.collections || []).forEach((group,groupIndex) => {
      const section=document.createElement('section'),items=Array.isArray(group.items)?group.items:[],type=collectionPresentationType(group),layout=resolvedCollectionLayout(group),candidates=collectionLayoutCandidates(group);section.className=`oshi-collection is-${type} layout-${layout}`;section.dataset.layoutVariant=String(group.layoutVariant||0);
      section.innerHTML=`<header class="oshi-collection-head"><b class="oshi-collection-number">${String(groupIndex+1).padStart(2,'0')}</b><div><span>${safe(group.eyebrow || 'COMMISSIONED WORKS')}</span><h3>${safe(group.title || '为他留下的画面')}</h3></div><small>${safe(LAYOUT_LABELS[layout])} · ${String(items.length).padStart(2,'0')}</small></header><div class="oshi-gallery"></div>`;
      const gallery=section.querySelector('.oshi-gallery');gallery.dataset.candidates=candidates.join(' ');
      if (!items.length) gallery.innerHTML='<div class="oshi-gallery-empty">暂无图片</div>';
      else if(layout==='cinema'||layout==='archive')renderJustifiedLayout(gallery,items,type,layout,Number(group.layoutVariant)||0);
      else if(layout==='gallery')renderGalleryLayout(gallery,items,type,Number(group.layoutVariant)||0);
      else if(layout==='masonry')renderMasonryLayout(gallery,items,type);
      else renderEditorialLayout(gallery,items,type,Number(group.layoutVariant)||0);
      if(group.quoteEnabled&&String(group.quoteText||'').trim()){
        const quote=document.createElement('blockquote');quote.className='oshi-collection-quote';quote.innerHTML=`<span>PORTRAIT NOTE</span><p>${safe(group.quoteText)}</p>`;gallery.appendChild(quote);
      }
      host.appendChild(section); hydrateOshiImages(section);
    });
  }
  function applyProfilePresentation(entry,image,resolved){
    const profile=$('oshiProfile'),visual=$('oshiProfileVisual');if(!profile||!visual)return;
    const layout=profilePresentation(entry,image?.naturalWidth||0,image?.naturalHeight||0),cropped=entry.profileFit==='cover';profile.dataset.profileLayout=layout;profile.dataset.profileCropped=String(cropped);visual.dataset.fit=cropped?'cover':'natural';
    visual.style.setProperty('--oshi-profile-fit',cropped?'cover':'contain');visual.style.setProperty('--oshi-profile-x',`${clampPercent(entry.profileX)}%`);visual.style.setProperty('--oshi-profile-y',`${clampPercent(entry.profileY)}%`);visual.style.setProperty('--oshi-profile-ratio',String((image?.naturalWidth||1)/(image?.naturalHeight||1)));visual.style.setProperty('--oshi-profile-bg','none');
  }
  function renderDetail(entry) {
    if (!entry) return;
    const setText=(id,value)=>{const node=$(id);if(node)node.textContent=value;};
    const review=String(entry.review??'').trim(),paragraphs=review.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
    const lead=paragraphs.shift()||'',leadSentence=(lead.match(/^.*?[。！？.!?](?:\s|$)/s)||[lead])[0].trim(),short=String(entry.short??leadSentence).trim();
    setText('oshiIssueLabel',entry.issueLabel);
    setText('oshiProfileName',entry.name);
    setText('oshiProfileAlt',entry.alt);
    setText('oshiProfileShort',short);
    setText('oshiProfileCv',entry.cv||'—');
    setText('oshiProfileGame',entry.game);
    setText('oshiProfileSince',entry.since||'—');
    const cvLabel=$('oshiProfileCv')?.previousElementSibling,gameLabel=$('oshiProfileGame')?.previousElementSibling,sinceLabel=$('oshiProfileSince')?.previousElementSibling;
    if(cvLabel)cvLabel.textContent=entry.voiceLabel;if(gameLabel)gameLabel.textContent=entry.fromLabel;if(sinceLabel)sinceLabel.textContent=entry.sinceLabel;
    setText('oshiReasonEyebrow',entry.reasonEyebrow);setText('oshiReasonTitle',entry.reasonTitle);setText('oshiFactsEyebrow',entry.factsEyebrow);setText('oshiFactsTitle',entry.factsTitle);
    const profileImage=$('oshiProfileImage'),detailToken=++detailImageToken,isCurrent=()=>detailToken===detailImageToken&&String(activeId||entry.id)===String(entry.id);setImage(profileImage,null,entry.image,entry.name,(image,resolved)=>{if(isCurrent())applyProfilePresentation(entry,image,resolved);},isCurrent);
    if(!entry.image&&detailToken===detailImageToken)applyProfilePresentation(entry,null,'');
    setText('oshiProfileImageCredit',entry.imageCredit);
    const leadNode=$('oshiReviewLead');if(leadNode){leadNode.textContent=lead;leadNode.hidden=!lead;}
    const reviewNode=$('oshiReviewBody');if(reviewNode)reviewNode.innerHTML=paragraphs.map(text=>`<p>${safe(text)}</p>`).join('');
    const tagsNode=$('oshiTags');if(tagsNode){tagsNode.innerHTML=(entry.tags||[]).map(tag=>`<span>${safe(tag)}</span>`).join('');tagsNode.hidden=!(entry.tags||[]).length;}
    const factsNode=$('oshiCharacterFacts');if(factsNode)factsNode.innerHTML=characterFacts(entry).map(row=>{const source=/引用来源|来源/i.test(row.key)&&/^https?:\/\//i.test(row.value);return `<div><dt>${safe(row.key)}</dt><dd>${source?`<a href="${safe(row.value)}" target="_blank" rel="noopener noreferrer">${safe(row.value)}</a>`:safe(row.value)}</dd></div>`;}).join('');
    renderTabs(entry);renderCollections(entry);const editingDetail=isEditor&&$('oshiEditorDrawer')?.classList.contains('open')&&!$('oshiDetailEditor')?.hidden;if(!editingDetail)syncDetailEditor(entry);
  }
  // 推角展示人物点击后仍进入推角展示自己的专题页；简介数据来自角色资料记录。
  function openDetail(id) {
    const entry=entries().find(row=>String(row.id)===String(id));
    if(!entry)return;
    if(hubEditing){hubEditing=false;closeDrawer();}
    activeId=String(id);
    $('oshiHubView').hidden=true;
    $('oshiDetailView').hidden=false;
    writeUiRoute('detail',id);
    renderDetail(entry);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function backHub() { closeDrawer();$('oshiDetailView').hidden=true; $('oshiHubView').hidden=false;writeUiRoute('hub'); renderHub(); window.scrollTo({top:0,behavior:'smooth'}); }
  window.amoristOshiOpenHub = backHub;
  function reorderIndex(fromId,toId) {
    if (!isEditor || String(fromId)===String(toId)) return;
    const order=entries().map(entry=>String(entry.id));
    const from=order.indexOf(String(fromId)),to=order.indexOf(String(toId));
    if(from<0||to<0)return;
    order.splice(to,0,...order.splice(from,1));
    state.order=order;
    saveState();
    renderHub();
  }
  function readUiRoute(){const route=parse(UI_ROUTE_KEY,{screen:'hub',id:''});return route&&typeof route==='object'?route:{screen:'hub',id:''};}
  function writeUiRoute(screen,id=''){write(UI_ROUTE_KEY,{screen:screen==='detail'?'detail':'hub',id:String(id||'')});}
  function openDrawer(mode) { if (!isEditor) return; $('oshiHubEditor').hidden=mode!=='hub'; $('oshiDetailEditor').hidden=mode!=='detail'; $('oshiDrawerTitle').textContent=mode==='hub'?'编辑总览':'编辑人物页'; $('oshiEditorDrawer').hidden=false; $('oshiDrawerBackdrop').hidden=false; $('oshiEditorDrawer').classList.add('open'); $('oshiDrawerBackdrop').classList.add('open'); if(mode==='hub')syncHubControls(); if(mode==='detail'){const entry=entries().find(row=>String(row.id)===String(activeId));syncDetailEditor(entry);renderCollectionEditor();} }
  function closeDrawer() { $('oshiEditorDrawer').classList.remove('open'); $('oshiDrawerBackdrop').classList.remove('open'); $('oshiEditorDrawer').hidden=true; $('oshiDrawerBackdrop').hidden=true; }
  function ensureDetailControls(){
    if(!isEditor||$('oshiEditIssue'))return;const form=$('oshiDetailEditor')?.querySelector('.oshi-form-grid'),anchor=$('oshiEditName')?.closest('label');if(!form||!anchor)return;
    const fields=document.createElement('div');fields.className='oshi-edit-content-fields';fields.innerHTML=`
      <label>页首标记<input id="oshiEditIssue"></label>
      <label>VOICE 标签<input id="oshiEditVoiceLabel"></label><label>声优内容<input id="oshiEditCv"></label>
      <label>FROM 标签<input id="oshiEditFromLabel"></label><label>作品内容<input id="oshiEditGame"></label>
      <label>FIRST MET 标签<input id="oshiEditSinceLabel"></label><label>初见内容<input id="oshiEditSince"></label>
      <label>理由英文眉题<input id="oshiEditReasonEyebrow"></label><label>理由标题<input id="oshiEditReasonTitle"></label>
      <label>资料英文眉题<input id="oshiEditFactsEyebrow"></label><label>资料标题<input id="oshiEditFactsTitle"></label>
      <label>主图署名<input id="oshiEditImageCredit"></label>`;
    anchor.before(fields);
    const cover=document.createElement('section');cover.className='oshi-cover-editor';cover.innerHTML=`<header><span class="oshi-field-label">人物页封面</span><small>自动识别横图、竖图与方图，也可手动指定</small></header><figure class="oshi-cover-preview" id="oshiCoverPreview" data-status="empty"><img id="oshiCoverPreviewImage" alt="人物页封面预览"><figcaption>LIVE COVER PREVIEW</figcaption></figure><div class="oshi-cover-controls"><label>封面版式<select id="oshiProfileLayout"><option value="auto">自动判断</option><option value="portrait">竖版人物</option><option value="cinema">横版电影</option><option value="minimal">极简画册</option></select></label><label>图片适配<select id="oshiProfileFit"><option value="auto">自动构图（不裁切）</option><option value="original">原图完整展示</option><option value="cover">铺满裁切</option></select></label><label data-oshi-profile-focus>横向焦点 <output id="oshiProfileXValue">50%</output><input id="oshiProfileX" type="range" min="0" max="100" step="1"></label><label data-oshi-profile-focus>纵向焦点 <output id="oshiProfileYValue">50%</output><input id="oshiProfileY" type="range" min="0" max="100" step="1"></label></div>`;
    const upload=$('oshiProfileUpload')?.closest('label');(upload||form.lastElementChild).before(cover);
    const facts=document.createElement('section');facts.className='oshi-facts-editor';facts.innerHTML='<header><span class="oshi-field-label">资料条目</span><button class="oshi-mini-btn" id="oshiAddFact" type="button">＋ 添加条目</button></header><div id="oshiFactsEditorList"></div>';
    (upload||form.lastElementChild).before(facts);
    $('oshiAddFact')?.addEventListener('click',()=>appendFactEditorRow({key:'新条目',value:''}));
  }
  function appendFactEditorRow(row){
    const host=$('oshiFactsEditorList');if(!host)return;const item=document.createElement('div');item.className='oshi-fact-editor-row';item.innerHTML=`<input data-oshi-fact-key aria-label="条目名" value="${safe(row?.key||'')}"><textarea data-oshi-fact-value aria-label="条目内容">${safe(row?.value||'')}</textarea><button type="button" aria-label="删除资料条目">×</button>`;item.querySelector('button').addEventListener('click',()=>item.remove());host.appendChild(item);
  }
  function renderFactsEditor(entry){const host=$('oshiFactsEditorList');if(!host)return;host.innerHTML='';characterFacts(entry).forEach(appendFactEditorRow);}
  function syncProfileFocusControls(entry){$$('[data-oshi-profile-focus]').forEach(node=>node.hidden=entry?.profileFit!=='cover');}
  async function updateCoverPreview(entry){
    const preview=$('oshiCoverPreview'),image=$('oshiCoverPreviewImage');if(!preview||!image||!entry)return;const token=++profilePreviewToken,cropped=entry.profileFit==='cover';syncProfileFocusControls(entry);preview.dataset.status=entry.profileImage?'loading':'empty';preview.dataset.fit=cropped?'cover':'natural';image.hidden=true;image.removeAttribute('src');
    preview.dataset.layout=entry.profileLayout||'auto';preview.style.setProperty('--oshi-cover-fit',cropped?'cover':'contain');preview.style.setProperty('--oshi-cover-x',`${clampPercent(entry.profileX)}%`);preview.style.setProperty('--oshi-cover-y',`${clampPercent(entry.profileY)}%`);
    if(!entry.profileImage)return;const resolved=await resolveImageSource(entry.profileImage);if(token!==profilePreviewToken)return;if(!resolved){preview.dataset.status='error';return;}
    image.onload=()=>{if(token!==profilePreviewToken)return;const resolvedLayout=profilePresentation(entry,image.naturalWidth,image.naturalHeight);preview.dataset.status='ready';image.hidden=false;preview.dataset.resolvedLayout=resolvedLayout;};image.onerror=()=>{if(token!==profilePreviewToken)return;preview.dataset.status='error';};image.src=resolved;
  }
  function syncDetailEditor(entry) {
    if(!isEditor || !entry) return;
    $('oshiDetailCharacterSelect').value=String(entry.id); $('oshiEditName').value=entry.name; $('oshiEditAlt').value=entry.alt; $('oshiEditShort').value=entry.short; $('oshiEditReview').value=entry.review; $('oshiEditTags').value=entry.tags.join(',');
    const values={oshiEditIssue:entry.issueLabel,oshiEditVoiceLabel:entry.voiceLabel,oshiEditCv:entry.cv,oshiEditFromLabel:entry.fromLabel,oshiEditGame:entry.game,oshiEditSinceLabel:entry.sinceLabel,oshiEditSince:entry.since,oshiEditReasonEyebrow:entry.reasonEyebrow,oshiEditReasonTitle:entry.reasonTitle,oshiEditFactsEyebrow:entry.factsEyebrow,oshiEditFactsTitle:entry.factsTitle,oshiEditImageCredit:entry.imageCredit};Object.entries(values).forEach(([id,value])=>{if($(id))$(id).value=value??'';});
    if($('oshiProfileLayout'))$('oshiProfileLayout').value=entry.profileLayout||'auto';if($('oshiProfileFit'))$('oshiProfileFit').value=entry.profileFit||'auto';if($('oshiProfileX')){$('oshiProfileX').value=clampPercent(entry.profileX);$('oshiProfileXValue').textContent=`${Math.round(clampPercent(entry.profileX))}%`;}if($('oshiProfileY')){$('oshiProfileY').value=clampPercent(entry.profileY);$('oshiProfileYValue').textContent=`${Math.round(clampPercent(entry.profileY))}%`;}
    renderFactsEditor(entry);updateCoverPreview(entry);
  }
  function saveCollections(entry,refreshEditor=false){updateEntry(entry.id,{collections:entry.collections});renderDetail(entry);if(refreshEditor)renderCollectionEditor();}
  function moveArrayItem(rows,from,to){if(from<0||to<0||from===to)return false;rows.splice(to,0,...rows.splice(from,1));return true;}
  function moveCollection(entry,groupId,direction){const index=entry.collections.findIndex(group=>String(group.id)===String(groupId));const to=Math.max(0,Math.min(entry.collections.length-1,index+direction));if(moveArrayItem(entry.collections,index,to))saveCollections(entry,true);}
  function moveCollectionImage(entry,group,itemId,direction){const index=group.items.findIndex(item=>String(item.id)===String(itemId));const to=Math.max(0,Math.min(group.items.length-1,index+direction));if(moveArrayItem(group.items,index,to))saveCollections(entry,true);}
  function updateThumbPreview(thumb,item){const image=thumb.querySelector('img');if(!image)return;const cropped=item.fit==='cover';thumb.dataset.fit=cropped?'cover':'natural';image.style.objectFit=cropped?'cover':'contain';image.style.objectPosition=`${clampPercent(item.focusX)}% ${clampPercent(item.focusY)}%`;thumb.querySelectorAll('[data-oshi-focus-control]').forEach(node=>node.hidden=!cropped);}
  function renderCollectionEditor() {
    const entry=entries().find(row => String(row.id)===String(activeId)),host=$('oshiCollectionEditorList');if(!entry||!host)return;host.innerHTML='';
    (entry.collections||[]).forEach((group,groupIndex) => {
      const type=collectionPresentationType(group),box=document.createElement('section');box.className='oshi-collection-editor';box.dataset.groupId=group.id;
      box.innerHTML=`<header><button class="oshi-drag-handle" type="button" draggable="true" data-oshi-group-drag="${safe(group.id)}" aria-label="拖动图片集排序">⋮⋮</button><div class="oshi-collection-title-fields"><input data-oshi-group-eyebrow aria-label="图片组英文眉题" value="${safe(group.eyebrow||'COMMISSIONED WORKS')}"><input data-oshi-group-title aria-label="图片组标题" value="${safe(group.title||'为他留下的画面')}"></div><div class="oshi-collection-editor-actions"><button class="oshi-mini-btn" type="button" data-oshi-group-up>↑</button><button class="oshi-mini-btn" type="button" data-oshi-group-down>↓</button><label class="oshi-mini-upload">＋ 添加图片<input type="file" accept="image/*" multiple></label><button class="oshi-mini-btn" type="button" data-oshi-delete-group="${safe(group.id)}">删除</button></div></header><div class="oshi-group-layout-controls"><label>图片集类型<select data-oshi-group-type><option value="auto">自动判断</option><option value="cg">CG / 电影专题</option><option value="artwork">ARTWORKS / 艺术画册</option><option value="archive">ARCHIVE / 收藏档案</option></select></label><label>当前排版<select data-oshi-layout-mode><option value="auto">自动推荐</option><option value="editorial">Editorial Flow</option><option value="cinema">Cinema Sequence</option><option value="gallery">Gallery Spread</option><option value="masonry">Original Masonry</option><option value="archive">Archive Grid</option></select></label><button class="product-button secondary small" type="button" data-oshi-cycle-layout>换一个合格版式</button><small class="oshi-layout-candidates" data-oshi-layout-candidates></small><label class="oshi-quote-toggle"><input type="checkbox" data-oshi-quote-enabled ${group.quoteEnabled?'checked':''}> 在图片集中显示人物引文</label><textarea data-oshi-quote-text placeholder="可选：不填写则不显示，也不占版面" ${group.quoteEnabled?'':'hidden'}>${safe(group.quoteText||'')}</textarea></div><div class="oshi-thumb-list"></div>`;
      box.querySelector('[data-oshi-group-type]').value=group.type||'auto';const candidates=collectionLayoutCandidates(group),layoutSelect=box.querySelector('[data-oshi-layout-mode]'),candidateText=box.querySelector('[data-oshi-layout-candidates]');layoutSelect.value=group.layoutMode||'auto';[...layoutSelect.options].forEach(option=>{option.disabled=option.value!=='auto'&&!candidates.includes(option.value);});candidateText.textContent=`合格候选：${candidates.map(mode=>LAYOUT_LABELS[mode]).join(' / ')} · 当前 ${LAYOUT_LABELS[resolvedCollectionLayout(group)]}`;
      const thumbs=box.querySelector('.oshi-thumb-list');
      (group.items||[]).forEach((item,index)=>{
        const thumb=document.createElement('article');thumb.className=`oshi-thumb is-${item.priority||'standard'}`;thumb.draggable=true;thumb.dataset.itemId=item.id;thumb.innerHTML=`<button class="oshi-drag-handle" type="button" aria-label="拖动图片排序">⋮⋮</button><figure><img alt=""><figcaption>${safe(item.alt||`图片 ${index+1}`)}</figcaption></figure><div class="oshi-thumb-controls"><div class="oshi-thumb-row"><button class="oshi-hero-toggle ${item.hero?'active':''}" type="button" title="设为本组主图" aria-pressed="${item.hero?'true':'false'}">★ 主图</button><label>层级<select data-oshi-item-priority><option value="feature">重点</option><option value="standard">标准</option><option value="support">辅助</option></select></label><label>显示<select data-oshi-item-fit><option value="auto">自动构图</option><option value="original">原图完整展示</option><option value="cover">铺满裁切</option></select></label></div><label data-oshi-focus-control>横向焦点 <output>${Math.round(clampPercent(item.focusX))}%</output><input data-oshi-item-x type="range" min="0" max="100" step="1" value="${clampPercent(item.focusX)}"></label><label data-oshi-focus-control>纵向焦点 <output>${Math.round(clampPercent(item.focusY))}%</output><input data-oshi-item-y type="range" min="0" max="100" step="1" value="${clampPercent(item.focusY)}"></label>${type==='cg'?`<label class="oshi-scene-caption">情节图注（可选）<textarea data-oshi-scene-caption placeholder="不填写时不显示，也不占版面">${safe(item.sceneCaption||'')}</textarea></label>`:''}<div class="oshi-thumb-actions"><button type="button" data-oshi-item-up>↑</button><button type="button" data-oshi-item-down>↓</button><button type="button" data-oshi-delete-item>删除</button></div></div>`;
        const img=thumb.querySelector('img');setImage(img,null,item.src,'');updateThumbPreview(thumb,item);thumb.querySelector('[data-oshi-item-priority]').value=item.priority||'standard';thumb.querySelector('[data-oshi-item-fit]').value=item.fit||'auto';
        thumb.addEventListener('dragstart',event=>{if(event.target.closest('input,select,textarea,button:not(.oshi-drag-handle)')){event.preventDefault();return;}imageDrag={groupId:group.id,itemId:item.id};event.dataTransfer.effectAllowed='move';});
        thumb.addEventListener('dragover',event=>{if(imageDrag?.groupId===group.id)event.preventDefault();});thumb.addEventListener('drop',event=>{if(!imageDrag||imageDrag.groupId!==group.id)return;event.preventDefault();const from=group.items.findIndex(row=>String(row.id)===String(imageDrag.itemId)),to=group.items.findIndex(row=>String(row.id)===String(item.id));imageDrag=null;if(moveArrayItem(group.items,from,to))saveCollections(entry,true);});thumb.addEventListener('dragend',()=>{imageDrag=null;});
        thumb.querySelector('.oshi-hero-toggle').addEventListener('click',()=>{const next=!item.hero;group.items.forEach(row=>row.hero=false);item.hero=next;saveCollections(entry,true);});
        thumb.querySelector('[data-oshi-item-priority]').addEventListener('change',event=>{item.priority=event.target.value;thumb.className=`oshi-thumb is-${item.priority}`;saveCollections(entry);});
        thumb.querySelector('[data-oshi-item-fit]').addEventListener('change',event=>{item.fit=event.target.value;updateThumbPreview(thumb,item);saveCollections(entry);});
        [['[data-oshi-item-x]','focusX'],['[data-oshi-item-y]','focusY']].forEach(([selector,key])=>thumb.querySelector(selector).addEventListener('input',event=>{item[key]=Number(event.target.value);event.target.previousElementSibling.textContent=`${Math.round(item[key])}%`;updateThumbPreview(thumb,item,type);saveCollections(entry);}));
        thumb.querySelector('[data-oshi-scene-caption]')?.addEventListener('input',event=>{item.sceneCaption=event.target.value;saveCollections(entry);});
        thumb.querySelector('[data-oshi-item-up]').addEventListener('click',()=>moveCollectionImage(entry,group,item.id,-1));thumb.querySelector('[data-oshi-item-down]').addEventListener('click',()=>moveCollectionImage(entry,group,item.id,1));thumb.querySelector('[data-oshi-delete-item]').addEventListener('click',()=>{if(!confirm(`从「${group.title||'当前图片集'}」删除这张图片？`))return;group.items.splice(index,1);saveCollections(entry,true);});thumbs.appendChild(thumb);
      });
      const dragHandle=box.querySelector('[data-oshi-group-drag]');dragHandle.addEventListener('dragstart',event=>{collectionDrag=group.id;event.dataTransfer.effectAllowed='move';});box.addEventListener('dragover',event=>{if(collectionDrag)event.preventDefault();});box.addEventListener('drop',event=>{if(!collectionDrag)return;event.preventDefault();const from=entry.collections.findIndex(row=>String(row.id)===String(collectionDrag)),to=entry.collections.findIndex(row=>String(row.id)===String(group.id));collectionDrag=null;if(moveArrayItem(entry.collections,from,to))saveCollections(entry,true);});dragHandle.addEventListener('dragend',()=>{collectionDrag=null;});
      box.querySelector('[data-oshi-group-up]').addEventListener('click',()=>moveCollection(entry,group.id,-1));box.querySelector('[data-oshi-group-down]').addEventListener('click',()=>moveCollection(entry,group.id,1));
      box.querySelector('[data-oshi-group-eyebrow]').addEventListener('change',event=>{group.eyebrow=event.target.value;saveCollections(entry);});box.querySelector('[data-oshi-group-title]').addEventListener('change',event=>{group.title=event.target.value;saveCollections(entry);});
      box.querySelector('[data-oshi-group-type]').addEventListener('change',event=>{group.type=event.target.value;group.layoutMode='auto';group.layoutVariant=0;saveCollections(entry,true);});box.querySelector('[data-oshi-layout-mode]').addEventListener('change',event=>{group.layoutMode=event.target.value;saveCollections(entry,true);});box.querySelector('[data-oshi-cycle-layout]').addEventListener('click',()=>{const candidates=collectionLayoutCandidates(group),current=resolvedCollectionLayout(group),next=(candidates.indexOf(current)+1)%candidates.length;group.layoutMode='auto';group.layoutVariant=next;saveCollections(entry,true);});
      const quoteEnabled=box.querySelector('[data-oshi-quote-enabled]'),quoteText=box.querySelector('[data-oshi-quote-text]');quoteEnabled.addEventListener('change',()=>{group.quoteEnabled=quoteEnabled.checked;quoteText.hidden=!group.quoteEnabled;saveCollections(entry);});quoteText.addEventListener('input',()=>{group.quoteText=quoteText.value;saveCollections(entry);});
      box.querySelector('.oshi-mini-upload input')?.addEventListener('change',event=>addImagesToCollection(group.id,event.target.files||[]));box.querySelector('[data-oshi-delete-group]').addEventListener('click',()=>{if(!confirm(`删除图片集「${group.title||'未命名图片集'}」及其中的全部图片？`))return;entry.collections=entry.collections.filter(row=>row.id!==group.id);saveCollections(entry,true);});host.appendChild(box);
    });
  }
  function populateSelects() { const rows=entries(); ['oshiHubCharacterSelect','oshiDetailCharacterSelect'].forEach(id => { const select=$(id); if(!select)return; select.innerHTML=rows.map(row=>`<option value="${safe(row.id)}">${safe(row.name)} · ${safe(row.game)}</option>`).join(''); }); }
  function setSelectedEntry(id) { const rows=visualEntries(); const index=rows.findIndex(row=>String(row.id)===String(id)); if(index<0)return; hubSelected=index; activeId=String(id);writeUiRoute('detail',id);renderDetail(rows[index]);syncDetailEditor(rows[index]); }
  function toggleHubEditing(force) { if(!isEditor)return; hubEditing=typeof force==='boolean'?force:!hubEditing; if(hubEditing)openDrawer('hub'); else closeDrawer(); renderHub(); }
  function resetSelectedLayout() { const entry=visualEntries()[hubSelected]; if(!entry)return; const next={...entry.hubLayout,...defaultLayouts[hubSelected % defaultLayouts.length]}; updateEntry(entry.id,{hubLayout:next}); renderHub(); }
  function saveDetail() { const entry=entries().find(row=>String(row.id)===String(activeId)); if(!entry)return; const facts=$$('.oshi-fact-editor-row').map(row=>({key:row.querySelector('[data-oshi-fact-key]').value.trim(),value:row.querySelector('[data-oshi-fact-value]').value.trim()})).filter(row=>row.key||row.value);updateEntry(entry.id,{displayName:$('oshiEditName').value.trim()||entry.name,alt:$('oshiEditAlt').value.trim(),short:$('oshiEditShort').value.trim(),review:$('oshiEditReview').value.trim(),tags:$('oshiEditTags').value.split(',').map(value=>value.trim()).filter(Boolean),profileImage:entry.profileImage||entry.image,profileLayout:$('oshiProfileLayout')?.value||entry.profileLayout,profileFit:$('oshiProfileFit')?.value||entry.profileFit,profileX:Number($('oshiProfileX')?.value??entry.profileX),profileY:Number($('oshiProfileY')?.value??entry.profileY),issueLabel:$('oshiEditIssue').value.trim(),voiceLabel:$('oshiEditVoiceLabel').value.trim(),cv:$('oshiEditCv').value.trim(),fromLabel:$('oshiEditFromLabel').value.trim(),game:$('oshiEditGame').value.trim(),sinceLabel:$('oshiEditSinceLabel').value.trim(),since:$('oshiEditSince').value.trim(),reasonEyebrow:$('oshiEditReasonEyebrow').value.trim(),reasonTitle:$('oshiEditReasonTitle').value.trim(),factsEyebrow:$('oshiEditFactsEyebrow').value.trim(),factsTitle:$('oshiEditFactsTitle').value.trim(),imageCredit:$('oshiEditImageCredit').value.trim(),facts}); closeDrawer(); renderHub(); renderDetail(entries().find(row=>String(row.id)===String(activeId))); toast('推角展示资料已保存'); }
  function resetDetail() { const entry=entries().find(row=>String(row.id)===String(activeId)); if(!entry)return; state.records=state.records.filter(row=>String(row.id)!==String(entry.id)); state.records.push({id:String(entry.id),hubLayout:entry.hubLayout,collections:entry.collections,landingImage:entry.landingImage,profileImage:entry.profileImage||entry.image,profileLayout:entry.profileLayout,profileFit:entry.profileFit,profileX:entry.profileX,profileY:entry.profileY,magazineFit:entry.magazineFit,magazineX:entry.magazineX,magazineY:entry.magazineY}); saveState();closeDrawer(); renderHub(); const restored=entries().find(row=>String(row.id)===String(activeId));if(restored){updateEntry(restored.id,{facts:restored.facts});renderDetail(entries().find(row=>String(row.id)===String(activeId)));} toast('已重新导入角色资料'); }
  async function addImagesToCollection(groupId, files, targetEntry=null) { const entry=targetEntry||entries().find(row=>String(row.id)===String(activeId)); if(!entry)return; const group=entry.collections.find(row=>String(row.id)===String(groupId)); if(!group)return; const images=await readImages(files); if(!images.length)return; const stored=window.amoristImageStore?await Promise.all(images.map(image=>window.amoristImageStore.putDataUrl(image.src,image.alt).then(src=>({...image,src})))):images; const offset=group.items.length;group.items.push(...stored.map((image,index)=>normalizeCollectionItem(image,group.id,offset+index))); saveCollections(entry,true); }
  async function createCollection() { const title=$('oshiNewCollectionTitle').value.trim(); const entry=entries().find(row=>String(row.id)===String(activeId)); if(!entry||!title)return; entry.collections.push(normalizeCollection({id:`set-${Date.now()}`,eyebrow:'COMMISSIONED WORKS',title,type:'auto',layoutVariant:0,items:[]},entry.collections.length)); $('oshiNewCollectionTitle').value=''; saveCollections(entry,true); }
  async function migrateOshiImages() { if(!isEditor||!window.amoristImageStore)return; let changed=false; for(const record of state.records||[]){ for(const key of ['image','profileImage','landingImage']){ if(/^data:image\//i.test(String(record?.[key]||''))){const ref=await window.amoristImageStore.putDataUrl(record[key],`${record.id}-${key}`);if(ref&&ref!==record[key]){record[key]=ref;changed=true;}} } for(const group of record.collections||[]){ for(const item of group.items||[]){ if(/^data:image\//i.test(String(item?.src||''))){const ref=await window.amoristImageStore.putDataUrl(item.src,`${record.id}-${group.id}`);if(ref&&ref!==item.src){item.src=ref;changed=true;}} } } } if(changed)saveState(); }
  function openLightbox(src) { if(!src)return; $('oshiLightboxImage').src=src; $('oshiLightbox').hidden=false; }

  function init() {
    if(!$('oshiCanvas'))return; $$('[data-oshi-editor-only]').forEach(node=>{node.hidden=!isEditor;});
    if($('oshiResetDetail'))$('oshiResetDetail').textContent='重新导入角色资料';
    ensureHubChrome();
    ensureMagazineControls();
    ensureDetailControls();snapshotImportedContentOnce();populateSelects();populateMagazineControls(); renderHub(); migrateOshiImages().then(()=>{populateSelects();renderHub();});
    const indexList=$('oshiIndexList');
    if(indexList){
      const decorateIndex=()=>$$('#oshiIndexList .oshi-index-link').forEach((button,index)=>{button.draggable=isEditor;button.dataset.oshiOrderId=String(entries()[index]?.id||'');});
      const indexObserver=new MutationObserver(decorateIndex);indexObserver.observe(indexList,{childList:true});decorateIndex();
      indexList.addEventListener('dragstart',event=>{const button=event.target.closest('.oshi-index-link');if(!isEditor||!button)return;button.dataset.oshiDragging='true';event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',button.dataset.oshiOrderId||'');});
      indexList.addEventListener('dragover',event=>{if(isEditor&&event.target.closest('.oshi-index-link'))event.preventDefault();});
      indexList.addEventListener('drop',event=>{const target=event.target.closest('.oshi-index-link');const source=event.dataTransfer?.getData('text/plain');if(!isEditor||!target||!source)return;event.preventDefault();reorderIndex(source,target.dataset.oshiOrderId);});
      indexList.addEventListener('dragend',event=>{event.target.closest('.oshi-index-link')?.removeAttribute('data-oshi-dragging');});
    }
    $$('[data-oshi-view-mode]').forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.oshiViewMode==='magazine'?'magazine':'flow';if(mode===hubViewMode)return;hubViewMode=mode;state.viewMode=mode;localStorage.setItem(UI_MODE_KEY,mode);saveState();renderHub();}));
    $('oshiEditButton')?.addEventListener('click',()=>toggleHubEditing()); $('oshiEditDetailButton')?.addEventListener('click',()=>openDrawer('detail')); $('oshiHubDone')?.addEventListener('click',()=>toggleHubEditing(false)); $('oshiBackButton')?.addEventListener('click',backHub); $('oshiDrawerClose')?.addEventListener('click',closeDrawer); $('oshiDrawerBackdrop')?.addEventListener('click',closeDrawer); $('oshiAddCollection')?.addEventListener('click',()=>openDrawer('detail')); $('oshiSaveDetail')?.addEventListener('click',saveDetail); $('oshiResetDetail')?.addEventListener('click',resetDetail); $('oshiCreateCollection')?.addEventListener('click',createCollection); $('oshiResetSelected')?.addEventListener('click',resetSelectedLayout); $('oshiResetAll')?.addEventListener('click',()=>{entries().forEach((entry,index)=>updateEntry(entry.id,{hubLayout:{...defaultLayouts[index % defaultLayouts.length]}}));renderHub();});
    $('oshiHubCharacterSelect')?.addEventListener('change',event=>{hubSelected=visualEntries().findIndex(row=>String(row.id)===String(event.target.value));syncHubControls();}); $('oshiDetailCharacterSelect')?.addEventListener('change',event=>{setSelectedEntry(event.target.value);renderCollectionEditor();});
    $('oshiDefaultFocus')?.addEventListener('change',event=>setDefaultFocus(event.target.value));
    $('oshiMagazineSlot')?.addEventListener('change',event=>moveSelectedToMagazineSlot(event.target.value));
    $('oshiMagazineFit')?.addEventListener('change',event=>{const entry=visualEntries()[hubSelected];if(!entry)return;entry.magazineFit=event.target.value==='cover'?'cover':'original';updateEntry(entry.id,{magazineFit:entry.magazineFit});syncMagazineFocusControls(entry);updateMagazinePreview(entry);renderHub();});
    ['oshiMagazineX','oshiMagazineY'].forEach(id=>$(id)?.addEventListener('input',()=>{const entry=visualEntries()[hubSelected];if(!entry)return;const magazineX=Number($('oshiMagazineX').value),magazineY=Number($('oshiMagazineY').value);$('oshiMagazineXValue').textContent=`${Math.round(magazineX)}%`;$('oshiMagazineYValue').textContent=`${Math.round(magazineY)}%`;updateEntry(entry.id,{magazineX,magazineY});const figure=$(`#oshiCanvas .oshi-figure[data-oshi-id="${CSS.escape(String(entry.id))}"]`);if(figure){figure.style.setProperty('--oshi-mag-x',`${magazineX}%`);figure.style.setProperty('--oshi-mag-y',`${magazineY}%`);}entry.magazineX=magazineX;entry.magazineY=magazineY;updateMagazinePreview(entry);}));
    ['oshiProfileLayout','oshiProfileFit'].forEach(id=>$(id)?.addEventListener('change',()=>{const entry=entries().find(row=>String(row.id)===String(activeId));if(!entry)return;entry.profileLayout=$('oshiProfileLayout').value;entry.profileFit=$('oshiProfileFit').value;updateEntry(entry.id,{profileLayout:entry.profileLayout,profileFit:entry.profileFit});syncProfileFocusControls(entry);renderDetail(entry);updateCoverPreview(entry);}));
    ['oshiProfileX','oshiProfileY'].forEach(id=>$(id)?.addEventListener('input',()=>{const entry=entries().find(row=>String(row.id)===String(activeId));if(!entry)return;entry.profileX=Number($('oshiProfileX').value);entry.profileY=Number($('oshiProfileY').value);$('oshiProfileXValue').textContent=`${Math.round(entry.profileX)}%`;$('oshiProfileYValue').textContent=`${Math.round(entry.profileY)}%`;updateEntry(entry.id,{profileX:entry.profileX,profileY:entry.profileY});renderDetail(entry);updateCoverPreview(entry);}));
    ['oshiWidth','oshiX','oshiY'].forEach(id=>$(id)?.addEventListener('input',()=>{const entry=entries()[hubSelected];if(!entry)return;entry.hubLayout.w=Number($('oshiWidth').value);entry.hubLayout.x=Math.max(0,Math.min(100-entry.hubLayout.w,Number($('oshiX').value)));entry.hubLayout.y=Number($('oshiY').value);updateEntry(entry.id,{hubLayout:entry.hubLayout});renderHub();})); $('oshiCaption')?.addEventListener('change',event=>{const entry=entries()[hubSelected];if(!entry)return;entry.hubLayout.caption=event.target.value;updateEntry(entry.id,{hubLayout:entry.hubLayout});renderHub();}); $('oshiBringFront')?.addEventListener('click',()=>{const entry=entries()[hubSelected];if(!entry)return;entry.hubLayout.z=Math.max(...entries().map(row=>row.hubLayout.z))+1;updateEntry(entry.id,{hubLayout:entry.hubLayout});renderHub();}); $('oshiSendBack')?.addEventListener('click',()=>{const entry=entries()[hubSelected];if(!entry)return;entry.hubLayout.z=Math.min(...entries().map(row=>row.hubLayout.z))-1;updateEntry(entry.id,{hubLayout:entry.hubLayout});renderHub();});
    $('oshiHubImageUpload')?.addEventListener('change',async event=>{const [image]=await readImages(event.target.files||[]);const entry=visualEntries()[hubSelected];if(image&&entry){const src=await (window.amoristImageStore?.putDataUrl(image.src,image.alt)||image.src);updateEntry(entry.id,{landingImage:src});renderHub();}event.target.value='';}); $('oshiProfileUpload')?.addEventListener('change',async event=>{const [image]=await readImages(event.target.files||[]);const entry=entries().find(row=>String(row.id)===String(activeId));if(image&&entry){const src=await (window.amoristImageStore?.putDataUrl(image.src,image.alt)||image.src);updateEntry(entry.id,{profileImage:src});const refreshed=entries().find(row=>String(row.id)===String(activeId));renderDetail(refreshed);syncDetailEditor(refreshed);}event.target.value='';}); $('oshiArtworksUpload')?.addEventListener('change',async event=>{const entry=entries().find(row=>String(row.id)===String(activeId));if(!entry)return;let group=entry.collections.find(row=>row.id==='artworks');if(!group){group=normalizeCollection({id:'artworks',title:'ARTWORKS',type:'artwork',items:[]},0);entry.collections.unshift(group);}await addImagesToCollection(group.id,event.target.files||[],entry);event.target.value='';}); $('oshiCgUpload')?.addEventListener('change',async event=>{const entry=entries().find(row=>String(row.id)===String(activeId));if(!entry)return;let group=entry.collections.find(row=>row.id==='cg');if(!group){group=normalizeCollection({id:'cg',title:'CG',type:'cg',items:[]},entry.collections.length);entry.collections.push(group);}await addImagesToCollection(group.id,event.target.files||[],entry);event.target.value='';});
    $('oshiOpenCharacter')?.addEventListener('click',()=>{const entry=entries().find(row=>String(row.id)===String(activeId)); if(!entry)return; window.amoristProductNavigate?.('characters',true); setTimeout(()=>{const card=[...document.querySelectorAll('#characterGrid .char-card')].find(node=>String(node.dataset.charId)===String(entry.id)); if(card)card.click(); else window.dispatchEvent(new CustomEvent('amorist-open-character',{detail:entry.bangumiCharacterId||entry.id}));},120);}); $('oshiOpenWork')?.addEventListener('click',()=>{const entry=entries().find(row=>String(row.id)===String(activeId)); if(!entry)return; window.amoristProductNavigate?.('library',true); setTimeout(()=>{const card=[...document.querySelectorAll('#gameLibraryGrid .game-card')].find(node=>String(node.dataset.gameId)===String(entry.gameId || entry.workId)); card?.click();},160);});
    $('oshiLightboxClose')?.addEventListener('click',()=>{$('oshiLightbox').hidden=true;}); $('oshiLightbox')?.addEventListener('click',event=>{if(event.target===$('oshiLightbox'))$('oshiLightbox').hidden=true;});
    window.renderOshiHub=()=>{if(document.querySelector('[data-product-view="oshi"]')?.classList.contains('active')){populateSelects();renderHub();const detail=$('oshiDetailView');if(detail && !detail.hidden)renderDetail(entries().find(row=>String(row.id)===String(activeId)));}};
    window.addEventListener('amorist-data-changed',event=>{if(event.detail?.chars||event.detail?.games||event.detail?.oshi){populateSelects();renderHub();}});
    const view=document.querySelector('[data-product-view="oshi"]'); if(view){new MutationObserver(()=>{if(view.classList.contains('active'))window.renderOshiHub();}).observe(view,{attributes:true,attributeFilter:['class']});}
    const route=readUiRoute();if(route.screen==='detail'&&route.id&&entries().some(row=>String(row.id)===String(route.id)))openDetail(route.id);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
