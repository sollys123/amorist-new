/* Amorist mobile application controller: navigation, editing workflow, backup and offline */
(() => {
  'use strict';
  const mobile = window.AmoristMobile || (window.AmoristMobile = {});
  const $ = (q,root=document) => root.querySelector(q);
  const $$ = (q,root=document) => Array.from(root.querySelectorAll(q));
  const viewNames = {home:'我的档案',library:'游戏档案',characters:'角色图鉴',timeline:'游玩日历',
    studio:'REPO 制作',forms:'图文创作',oshi:'推角展示',bangumi:'作品索引',omikuji:'御签所'};
  const privatePrefixes = ['am-mobile-','am-publisher-','am-vault-'];
  let currentView = 'home';
  let previousView = 'home';
  let showDetailBack = false;
  let notifyTimer;
  const toast = mobile.toast || (message=>console.log(message));

  function view() {
    return $('.product-view.active')?.dataset.productView || 'home';
  }
  function syncHeader() {
    const next = view();
    if (next !== currentView) {
      previousView = currentView;
      currentView = next;
      window.scrollTo({top:0,behavior:'instant'});
    }
    const gameDetail = next === 'library' && !!$('#gameDetailPanel') && !$('#gameDetailPanel').hidden;
    const title = gameDetail ? ($('#gameDetailPanel h2')?.textContent || '游戏详情') : (viewNames[next] || 'Amorist');
    $('#amTopbarTitle').textContent = title;
    $('#amBackBtn').hidden = !gameDetail && next === 'home';
    showDetailBack = gameDetail;
    $$('.am-bottom-tabs [data-product-target]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.productTarget===next);
      btn.setAttribute('aria-current',btn.dataset.productTarget===next?'page':'false');
    });
    const more = $('#mobileMoreToggle');
    if (more) more.classList.toggle('active',!['home','library','characters','timeline'].includes(next));
    if(next === 'studio' && !document.body.classList.contains('am-studio-form') &&
      !document.body.classList.contains('am-studio-canvas')) setStudioMode('form');
  }
  function navigateBack() {
    if ($('#amPublishDialog')?.open) return $('#amPublishDialog').close();
    if ($('#mobileMoreSheet') && !$('#mobileMoreSheet').hidden) return $('#mobileMoreClose')?.click();
    if (showDetailBack && $('.game-detail-back')) return $('.game-detail-back').click();
    const next=previousView!==currentView?previousView:'home';
    window.amoristProductNavigate?.(next);
  }
  $('#amBackBtn')?.addEventListener('click',navigateBack);
  new MutationObserver(syncHeader).observe($('.product-main')||document.body,{
    attributes:true,subtree:true,attributeFilter:['class','hidden','data-library-screen']
  });
  window.addEventListener('hashchange',()=>requestAnimationFrame(syncHeader));
  document.addEventListener('click',event=>{
    if(event.target.closest('.game-library-grid,.game-detail-back,.product-nav-btn,.character-grid,.mobile-more-grid'))
      setTimeout(syncHeader,40);
  });
  syncHeader();

  // Preserve the full original canvas and editing capabilities. The quick form
  // is an additional mobile editor with two-way synchronized input elements.
  const repoFields = [
    {id:'workTitle',label:'REPO 标题',type:'input'},
    {id:'gameName',label:'游戏名称',type:'input'},
    {id:'playTime',label:'游玩时长',type:'input'},
    {id:'plotRank',label:'剧情喜好排序',type:'input'},
    {id:'charRank',label:'角色好感排序',type:'input'},
    {id:'favoriteEnd',label:'最喜欢的结局',type:'input'},
    {id:'favoriteReview',label:'最喜爱角色简评',type:'textarea'}
  ];
  function populateQuickForm() {
    const shell=$('#amStudioFields'); if(!shell) return;
    shell.textContent='';
    repoFields.forEach(spec=>{
      const source=document.getElementById(spec.id);
      if(!source) return;
      const wrap=document.createElement('div');wrap.className='am-studio-field';
      const label=document.createElement('label');label.textContent=spec.label;
      const proxy=document.createElement(spec.type==='textarea'?'textarea':'input');
      proxy.id='am-field-'+spec.id;label.htmlFor=proxy.id;
      proxy.value=source.value||'';
      proxy.placeholder=source.getAttribute('placeholder')||'点击填写';
      proxy.addEventListener('input',()=>{
        source.value=proxy.value;
        source.dispatchEvent(new Event('input',{bubbles:true}));
        source.dispatchEvent(new Event('change',{bubbles:true}));
      });
      source.addEventListener('input',()=>{if(document.activeElement!==proxy)proxy.value=source.value;});
      wrap.append(label,proxy);shell.append(wrap);
    });
    const hint=document.createElement('p');hint.className='am-studio-hint';
    hint.textContent='角色图片、评分、主题、图片素材、长评分页、存档及截图导出，均可在「画布与排版」中完整编辑。';
    shell.append(hint);
  }
  function setStudioMode(mode) {
    const next=mode==='canvas'?'canvas':'form';
    document.body.classList.remove('am-studio-form','am-studio-canvas');
    document.body.classList.add('am-studio-'+next);
    $$('[data-am-studio-mode]').forEach(button=>button.classList.toggle('active',button.dataset.amStudioMode===next));
    if(next==='form')populateQuickForm();
    else {
      // Original canvas autosizing reads the active viewport.
      requestAnimationFrame(()=>{
        window.dispatchEvent(new Event('resize'));
        window.visualViewport?.dispatchEvent(new Event('resize'));
      });
    }
    try{localStorage.setItem('am-mobile-studio-mode',next);}catch(_){}
  }
  $$('[data-am-studio-mode]').forEach(button=>button.addEventListener('click',()=>setStudioMode(button.dataset.amStudioMode)));
  $('#amStudioToCanvas')?.addEventListener('click',()=>setStudioMode('canvas'));
  $('#amStudioArchive')?.addEventListener('click',()=>{
    setStudioMode('canvas');setTimeout(()=>$('#archiveBtn')?.click(),80);
  });
  setStudioMode(localStorage.getItem('am-mobile-studio-mode')||'form');

  // Keep track of private edits, but avoid app-specific metadata in published bundles.
  function markChanged() {
    $('#amSaveIndicator')?.classList.add('pending');
    clearTimeout(notifyTimer);
    notifyTimer=setTimeout(()=>{
      $('#amSaveIndicator')?.classList.remove('pending');
      const status=$('#amDraftStatus');
      if(status) status.textContent='本地内容已自动保存 · '+new Date().toLocaleString('zh-CN');
    },900);
    mobile.hasLocalChanges=true;
  }
  try {
    const nativeSet=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      const result=nativeSet.call(this,key,value);
      if(this===window.localStorage && typeof key==='string' &&
        !privatePrefixes.some(prefix=>key.startsWith(prefix)) &&
        (key.startsWith('amorist-')||key.startsWith('amorist.')||key.startsWith('otomeRepoMaker.')))
        markChanged();
      return result;
    };
  } catch(error){console.warn('Storage tracking unavailable',error);}

  const dialog=$('#amPublishDialog');
  function openPublish() {
    if(!dialog) return;
    if($('#mobileMoreSheet') && !$('#mobileMoreSheet').hidden) $('#mobileMoreClose')?.click();
    if(!dialog.open) dialog.showModal();
    $('#amDraftStatus').textContent='档案保存在本机；只有点击发布后访客才能看到变更。';
    window.AmoristPublisher?.refresh?.();
  }
  mobile.openPublish=openPublish;
  $('#amOpenPublish')?.addEventListener('click',openPublish);
  $('#amMorePublish')?.addEventListener('click',openPublish);
  $$('[data-am-close]').forEach(btn=>btn.addEventListener('click',()=>{
    document.getElementById(btn.dataset.amClose)?.close();
  }));
  dialog?.addEventListener('click',event=>{
    if(event.target===dialog) dialog.close();
  });

  // Database-level backup includes artwork, drafts and REPO archives,
  // which are not part of the published JSON.
  const MANAGED_KEYS = key => (key.startsWith('amorist-')||key.startsWith('amorist.')||
    key.startsWith('amoristUi.')||key.startsWith('otomeRepoMaker.')||key.startsWith('am-mobile-')) &&
    !key.startsWith('am-vault-') && !key.startsWith('am-publisher-') && !key.includes('github-token');

  const bytesToBase64 = bytes => {
    let binary='';
    const step=8192;
    for(let i=0;i<bytes.length;i+=step)
      binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+step));
    return btoa(binary);
  };
  const base64ToBytes = s => Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const blobToDataUrl = blob => new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
  async function serialize(value) {
    if(value instanceof Blob)return {__amType:'Blob',data:await blobToDataUrl(value)};
    if(value instanceof ArrayBuffer)return {__amType:'ArrayBuffer',data:bytesToBase64(new Uint8Array(value))};
    if(Array.isArray(value))return Promise.all(value.map(serialize));
    if(value && typeof value==='object'){
      const out={};for(const [k,v] of Object.entries(value))out[k]=await serialize(v);return out;
    }
    return value;
  }
  async function deserialize(value) {
    if(value?.__amType==='Blob')return await (await fetch(value.data)).blob();
    if(value?.__amType==='ArrayBuffer')return base64ToBytes(value.data).buffer;
    if(Array.isArray(value))return Promise.all(value.map(deserialize));
    if(value && typeof value==='object'){
      const out={};for(const [k,v] of Object.entries(value))out[k]=await deserialize(v);return out;
    }
    return value;
  }
  const IDB_NAMES=['amorist-image-store-v1','otomeRepoMakerArchives'];
  const openDatabase=(name,version)=>new Promise((resolve,reject)=>{
    const q=indexedDB.open(name,version);
    q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
  async function dumpDatabase(name) {
    let db;
    try{db=await openDatabase(name);}catch(error){
      console.warn('Database inaccessible',name,error);return null;
    }
    try {
      if(!db.objectStoreNames.length)return null;
      const obj={name,version:db.version,stores:[]};
      for(const storeName of Array.from(db.objectStoreNames)){
        const tx=db.transaction(storeName,'readonly');
        const store=tx.objectStore(storeName);
        const keyPath=store.keyPath;
        const keys=await new Promise((resolve,reject)=>{
          const r=store.getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
        });
        const values=await new Promise((resolve,reject)=>{
          const r=store.getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
        });
        const rows=[];
        for(let i=0;i<values.length;i++)rows.push({key:await serialize(keys[i]),value:await serialize(values[i])});
        obj.stores.push({name:storeName,keyPath,autoIncrement:store.autoIncrement,rows});
      }
      return obj;
    }finally{db.close();}
  }
  async function restoreDatabase(snapshot) {
    if(!snapshot?.name||!Array.isArray(snapshot.stores))return;
    let db=await openDatabase(snapshot.name);
    const missing=snapshot.stores.filter(st=>!db.objectStoreNames.contains(st.name));
    if(missing.length){
      const upgradeVersion=Math.max(db.version+1,Number(snapshot.version)||1);
      db.close();
      db=await new Promise((resolve,reject)=>{
        const q=indexedDB.open(snapshot.name,upgradeVersion);
        q.onupgradeneeded=()=>{
          for(const st of missing){
            if(q.result.objectStoreNames.contains(st.name))continue;
            q.result.createObjectStore(st.name,{
              ...(st.keyPath!==null?{keyPath:st.keyPath}:{}),
              autoIncrement:Boolean(st.autoIncrement)
            });
          }
        };
        q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
      });
    }
    try {
      for(const st of snapshot.stores){
        if(!db.objectStoreNames.contains(st.name))continue;
        const prepared=[];
        for(const row of st.rows||[])prepared.push({
          key:await deserialize(row.key),value:await deserialize(row.value)
        });
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(st.name,'readwrite');
          const store=tx.objectStore(st.name);
          store.clear();
          for(const row of prepared) {
            if(store.keyPath===null)store.put(row.value,row.key);
            else store.put(row.value);
          }
          tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('IndexedDB 写入失败'));
        });
      }
    }finally{db.close();}
  }
  mobile.exportBackup = async()=>{
    const store={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key && MANAGED_KEYS(key))store[key]=localStorage.getItem(key);
    }
    const databases=[];
    for(const name of IDB_NAMES) {
      const db=await dumpDatabase(name);
      if(db)databases.push(db);
    }
    return {type:'amorist-mobile-complete-backup',version:2,
      exportedAt:new Date().toISOString(),localStorage:store,indexedDB:databases};
  };
  function downloadBlob(blob,name){
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),20000);
  }
  $('#amBackupExport')?.addEventListener('click',async()=>{
    const button=$('#amBackupExport'),label=button.textContent;button.disabled=true;button.textContent='正在打包…';
    try {
      const backup=await mobile.exportBackup();
      downloadBlob(new Blob([JSON.stringify(backup)],{type:'application/json'}),
        'Amorist_完整手机备份_'+new Date().toISOString().slice(0,10)+'.json');
      toast('已导出完整备份，包括 REPO 存档和本地图片');
    }catch(error){toast('备份失败：'+error.message)}
    finally{button.disabled=false;button.textContent=label}
  });
  $('#amBackupImport')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try {
      const backup=JSON.parse(await file.text());
      if(backup.type!=='amorist-mobile-complete-backup'||!backup.localStorage||!Array.isArray(backup.indexedDB))
        throw new Error('不是有效的 Amorist 手机备份');
      if(!confirm('恢复备份将覆盖当前手机上的本地编辑内容和 REPO 存档。请先导出一份当前备份。确定继续吗？'))return;
      for(const [key,value] of Object.entries(backup.localStorage)){
        if(MANAGED_KEYS(key))localStorage.setItem(key,String(value));
      }
      for(const db of backup.indexedDB)await restoreDatabase(db);
      toast('备份已导入，即将重新载入应用');
      setTimeout(()=>location.reload(),600);
    }catch(error){toast('恢复失败：'+error.message)}
    finally{event.target.value=''}
  });

  if('serviceWorker' in navigator && location.protocol==='https:') {
    navigator.serviceWorker.register('./mobile/sw.js',{scope:'./mobile/'}).catch(error=>{
      console.warn('PWA offline worker registration failed',error);
    });
  }
  async function offlineWorker() {
    if(!('serviceWorker' in navigator))throw new Error('当前浏览器不支持离线资源管理');
    const reg=await navigator.serviceWorker.ready;
    if(!reg.active)throw new Error('离线服务尚未启用，请刷新重试');
    return reg.active;
  }
  $('#amDownloadOffline')?.addEventListener('click',async()=>{
    try{
      const sw=await offlineWorker();
      $('#amOfflineStatus').textContent='正在下载资源（请保持应用打开）…';
      $('#amDownloadOffline').disabled=true;
      sw.postMessage({type:'AM_DOWNLOAD_ALL'});
    }catch(error){$('#amOfflineStatus').textContent=error.message;$('#amDownloadOffline').disabled=false;}
  });
  $('#amClearOffline')?.addEventListener('click',async()=>{
    if(!confirm('清理已下载的图片和可选资源？本地档案与编辑内容不会删除。'))return;
    try{(await offlineWorker()).postMessage({type:'AM_CLEAR_EXTRA'});}
    catch(error){toast(error.message)}
  });
  navigator.serviceWorker?.addEventListener('message',event=>{
    const data=event.data||{};
    if(data.type==='AM_OFFLINE_PROGRESS'){
      const el=$('#amOfflineStatus');
      if(el)el.textContent=data.message||'';
      if(data.done)$('#amDownloadOffline').disabled=false;
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && $('#amPublishDialog')?.open)$('#amPublishDialog').close();
  });
  function loadPublisher(){
    const js=document.createElement('script');
    js.src='./mobile/publish.js?v=20261024-1';
    js.onload=()=>window.AmoristPublisher?.refresh?.();
    js.onerror=()=>console.error('Amorist publisher could not load');
    document.body.appendChild(js);
  }
  loadPublisher();
  mobile.syncHeader=syncHeader;
  mobile.setStudioMode=setStudioMode;
  console.info('[Amorist mobile]',mobile.version,'touch-first editor ready');
})();