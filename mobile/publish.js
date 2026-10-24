/* Amorist mobile secure GitHub publisher.
 * Scope: personal published JSON and new images only.
 * Never places credentials in published files, cache, query strings or console.
 */
(() => {
  'use strict';
  const mobile=window.AmoristMobile||(window.AmoristMobile={});
  const $=q=>document.querySelector(q);
  const REPO_DEFAULT='sollys123/amorist-new';
  const DATA_PATH='data/amorist-data.json';
  const VAULT_KEY='am-vault-github-v1';
  const BASE_SHA_KEY='am-mobile-published-sha-v2';
  const VERSION_KEY='am-mobile-publication-version-v2';
  const EXCLUDE_KEYS=new Set([
    'amorist-public-preview-v1','amorist-media-library-v2','amorist-anime-library-v1',
    'amorist-workshop-current-v2','amorist-workshop-sheets-v1','amorist-workshop-templates-v1',
    'amorist-product-session-v1','amorist-bangumi-static-version',
    'amorist-product-view-v1','amoristUi.productView.v1',
    'otomeRepoMaker.v7','otomeRepoMaker.currentArchiveId',
    'otomeRepoMaker.archives.v1','otomeRepoMaker.imageLibrary.v1',
    'otomeRepoMaker.trash.v1','otomeRepoMaker.activePage.v1'
  ]);
  const MANAGED_PREFIXES=['amorist-','amorist.','amoristUi.'];
  let sessionToken='';
  let busy=false;
  let vaultReady=false;
  let baseline=null;
  let connected=false;
  const toast=mobile.toast||(message=>alert(message));

  function status(message,mode=''){
    const el=$('#amPublishProgress');
    if(!el)return;el.textContent=message;el.className='am-progress '+mode;
  }
  function isPublishable(key){
    return MANAGED_PREFIXES.some(prefix=>key.startsWith(prefix)) &&
      !EXCLUDE_KEYS.has(key) && !key.startsWith('am-') &&
      !key.includes('github') && !key.toLowerCase().includes('token');
  }
  const repo=()=>{
    const name=($('#amRepoField')?.value||REPO_DEFAULT).trim();
    if(!/^[\w.-]+\/[\w.-]+$/.test(name))throw new Error('仓库格式应为 owner/repository');
    return name;
  };
  const branch=()=>{
    const value=($('#amBranchField')?.value||'main').trim();
    if(!value||!/^[-_\w./]+$/.test(value)||value.includes('..')||value.startsWith('/'))
      throw new Error('发布分支名称无效');
    return value;
  };
  const bytesToBase64=bytes=>{
    let binary='';for(let i=0;i<bytes.length;i+=8192)
      binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
    return btoa(binary);
  };
  const base64ToBytes=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  const enc=new TextEncoder();
  function endpoint(path) {
    const [owner,name]=repo().split('/');
    return 'https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(name)+'/contents/'+
      path.split('/').map(encodeURIComponent).join('/');
  }
  function authHeaders(){
    return {
      'Accept':'application/vnd.github+json',
      'Authorization':'Bearer '+sessionToken,
      'Content-Type':'application/json'
    };
  }
  async function api(method,path,payload) {
    if(!sessionToken)throw new Error('请先连接 GitHub，或解锁本机授权');
    const url=endpoint(path)+(method==='GET'?'?ref='+encodeURIComponent(branch()):'');
    let response;
    try {
      response=await fetch(url,{method,headers:authHeaders(),
        ...(payload?{body:JSON.stringify(payload)}:{}),cache:'no-store'});
    } catch(error) {
      throw new Error('GitHub API 网络请求失败，请检查联网情况：'+error.message);
    }
    const result=await response.json().catch(()=>({}));
    if(response.status===404 && method==='GET')return null;
    if(!response.ok) {
      const message=result.message||response.statusText||'未知错误';
      throw new Error('GitHub '+response.status+'：'+message);
    }
    return result;
  }

  // Contents API returns a SHA for large JSON files, but omits their inline
  // content above 1 MB. Git Blobs API gives us the actual remote version so
  // a phone that was initialized while Pages lagged can never silently replace
  // someone else's more recent publication.
  async function readPublishedBlob(sha){
    const [owner,name]=repo().split('/');
    const url='https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+
      encodeURIComponent(name)+'/git/blobs/'+encodeURIComponent(sha);
    const response=await fetch(url,{headers:authHeaders(),cache:'no-store'});
    if(!response.ok)throw new Error('无法核对远端数据：GitHub '+response.status);
    const blob=await response.json();
    if(blob.encoding!=='base64'||!blob.content)
      throw new Error('远端数据内容暂时无法读取，已中止以保护公开站');
    try{return JSON.parse(new TextDecoder().decode(base64ToBytes(blob.content.replace(/\\s/g,''))))}
    catch{throw new Error('远端档案无法解析，已中止以避免覆盖')}
  }
  function bytesToDataUrl(bytes,type){
    return 'data:'+type+';base64,'+bytesToBase64(bytes);
  }
  async function sha256(bytes){
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  function decodeImage(value) {
    const m=/^data:(image\/(?:png|jpeg|jpg|webp|gif|avif|svg\+xml));base64,([\s\S]+)$/i.exec(value);
    if(!m)return null;
    return {mime:m[1].toLowerCase(),bytes:base64ToBytes(m[2].replace(/\s+/g,''))};
  }
  const mimeExt={'image/png':'png','image/jpeg':'jpg','image/jpg':'jpg',
    'image/webp':'webp','image/gif':'gif','image/avif':'avif','image/svg+xml':'svg'};
  const imageUploads=new Map();
  async function externalize(value) {
    if(typeof value==='string') {
      if(value.startsWith('idb-image:')){
        const resolved=await window.amoristImageStore?.resolve?.(value);
        if(!resolved)throw new Error('图片 '+value.slice(0,24)+' 丢失，请恢复原始图片后重试');
        return externalize(resolved);
      }
      if(value.startsWith('blob:'))throw new Error('有未保存的临时图片，请先保存后再发布');
      if(value.startsWith('data:image/')){
        const image=decodeImage(value);
        if(!image)throw new Error('暂不支持当前图片编码，请换用 PNG/JPEG/WebP 后重试');
        const hash=await sha256(image.bytes);
        const filePath='assets/user-media/mobile-'+hash.slice(0,24)+'.'+(mimeExt[image.mime]||'png');
        if(!imageUploads.has(filePath))imageUploads.set(filePath,bytesToBase64(image.bytes));
        return filePath;
      }
      return value;
    }
    if(Array.isArray(value)){
      const result=[];for(const item of value)result.push(await externalize(item));return result;
    }
    if(value && typeof value==='object'){
      const result={};for(const [key,item] of Object.entries(value))result[key]=await externalize(item);
      return result;
    }
    return value;
  }

  async function preparePublication(){
    if(!mobile.lastPublished){
      const response=await fetch(new URL('./data/amorist-data.json',document.baseURI),{cache:'no-store'});
      if(!response.ok)throw new Error('无法读取现有公开档案，请联网并刷新后重试');
      mobile.lastPublished=await response.json();
    }
    const original=mobile.lastPublished;
    if(original?.type!=='amorist-public-data'||!original.localStorage)
      throw new Error('原有公开档案格式不正确，已停止发布以保护数据');
    const published={...original.localStorage};
    imageUploads.clear();
    let keys=0;
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||!isPublishable(key))continue;
      const raw=localStorage.getItem(key);
      if(raw===null)continue;
      let parsed;
      try{parsed=JSON.parse(raw)}catch{parsed=raw}
      // The released schema stores each localStorage value as serialized text.
      const transformed=await externalize(parsed);
      published[key]=typeof transformed==='string'?transformed:JSON.stringify(transformed);
      keys++;
    }
    // Never expose current navigation state in the published site.
    published['amorist-product-view-v1']='home';
    delete published['amorist-public-preview-v1'];
    for(const key of Object.keys(published)){
      if(key.startsWith('am-')||key.toLowerCase().includes('token'))delete published[key];
    }
    const payload={
      ...original,
      type:'amorist-public-data',
      schemaVersion:Number(original.schemaVersion)||1,
      dataStructureVersion:Number(original.dataStructureVersion)||1,
      exportedAt:new Date().toISOString(),
      localStorage:published
    };
    return {payload,keys,images:[...imageUploads]};
  }

  async function deriveKey(password,salt) {
    const seed=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:240000,hash:'SHA-256'},seed,
      {name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function encryptToken(token,password){
    if(password.length<8)throw new Error('设备密码至少需要 8 位字符');
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await deriveKey(password,salt);
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(token));
    return {version:1,kdf:'PBKDF2-SHA256',rounds:240000,
      salt:bytesToBase64(salt),iv:bytesToBase64(iv),
      ciphertext:bytesToBase64(new Uint8Array(ciphertext))};
  }
  async function decryptToken(blob,password){
    const salt=base64ToBytes(blob.salt),iv=base64ToBytes(blob.iv);
    const key=await deriveKey(password,salt);
    const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv},
      key,base64ToBytes(blob.ciphertext));
    return new TextDecoder().decode(clear);
  }
  function updateAuthUI() {
    connected=Boolean(sessionToken);
    const btn=$('#amConnectGithub');
    if(btn)btn.textContent=connected?'已连接 GitHub ✓':'连接 / 解锁 GitHub';
    if($('#amAuthHelp')){
      $('#amAuthHelp').textContent=connected?
        'GitHub 授权仅存在当前会话内；设置设备密码后可加密保存在本机以供下次解锁。':
        '首次使用：在 GitHub 创建仅授权当前仓库、Contents: Read and write 的 fine-grained token。可设置设备密码加密保存，绝不将明文 token 写进仓库。';
    }
    if($('#amPublishNow'))$('#amPublishNow').disabled=!connected||!$('#amPublishConfirm')?.checked||busy;
  }
  async function validateToken(){
    const data=await api('GET',DATA_PATH);
    if(!data?.sha)throw new Error('无法读取目标仓库中的 '+DATA_PATH);
    return data;
  }

  $('#amConnectGithub')?.addEventListener('click',async()=>{
    const token=$('#amGithubToken')?.value.trim()||'';
    const password=$('#amVaultPin')?.value||'';
    try {
      if(token){
        sessionToken=token;
        await validateToken();
        if(password){
          const vault=await encryptToken(token,password);
          localStorage.setItem(VAULT_KEY,JSON.stringify(vault));
          vaultReady=true;
        }
        $('#amGithubToken').value='';
        toast(password?'GitHub 已连接，授权已加密保存在本机':'GitHub 已连接（仅限当前会话）');
      }else if(localStorage.getItem(VAULT_KEY)){
        if(!password)throw new Error('请输入用于加密保存授权的设备密码');
        sessionToken=await decryptToken(JSON.parse(localStorage.getItem(VAULT_KEY)),password);
        await validateToken();
        toast('GitHub 授权已解锁');
      }else if(!sessionToken)throw new Error('请粘贴 GitHub fine-grained token');
      $('#amVaultPin').value='';
      updateAuthUI();
      refresh();
    }catch(error){
      sessionToken='';updateAuthUI();
      toast('连接失败：'+(error.message.includes('OperationError')?'设备密码错误':error.message));
    }
  });
  $('#amForgetGithub')?.addEventListener('click',()=>{
    sessionToken='';
    localStorage.removeItem(VAULT_KEY);
    $('#amGithubToken').value='';
    $('#amVaultPin').value='';
    updateAuthUI();toast('本机授权已清除');
  });
  $('#amPublishConfirm')?.addEventListener('change',updateAuthUI);

  async function refresh(){
    const date=localStorage.getItem(VERSION_KEY)||mobile.remotePublicationAt||'';
    const statusEl=$('#amPublicationStatus');
    if(statusEl)statusEl.textContent=date?
      '上次已发布版本：'+new Date(date).toLocaleString('zh-CN')+'；当前编辑仅保存在本机':
      '未找到发布基线；初次发布将先核对远端版本';
    const prior=$('#amDraftStatus');
    if(prior)prior.textContent='本机内容自动保存；公开站仅展示上次成功发布的版本。';
    updateAuthUI();
  }

  async function publish() {
    if(busy)return;
    if(!sessionToken)throw new Error('请先连接 GitHub');
    if(!$('#amPublishConfirm')?.checked)throw new Error('请先确认本次内容可以公开');
    if(repo()!==REPO_DEFAULT) {
      if(!confirm('你正在发布到不同仓库 '+repo()+'。当前公开站仍读取 '+REPO_DEFAULT+' 的数据。确定继续吗？'))
        return;
    }
    busy=true;updateAuthUI();
    const button=$('#amPublishNow');button.textContent='正在发布…';
    try {
      status('正在核对远端版本…');
      const before=await validateToken();
      const currentPublished=await readPublishedBlob(before.sha);
      const expectedPublication=localStorage.getItem(VERSION_KEY)||mobile.remotePublicationAt||'';
      if(currentPublished?.type!=='amorist-public-data'||!currentPublished.localStorage)
        throw new Error('仓库中发布数据结构异常，已停止覆盖');
      if(expectedPublication && String(currentPublished.exportedAt||'')!==String(expectedPublication))
        throw new Error('远端档案的发布时间与本机基线不同，可能已有其他设备更新。请核对并合并数据后再发布');
      const knownSha=localStorage.getItem(BASE_SHA_KEY);
      baseline=knownSha||baseline;
      // If the public file has changed on another computer, do not overwrite it.
      if(baseline && before.sha!==baseline)
        throw new Error('远端公开档案已经由其他设备更新。已停止发布以防覆盖。请先在原编辑端导出备份，再手动合并两个设备的修改。');
      if(!baseline){
        const expected=localStorage.getItem(VERSION_KEY)||mobile.remotePublicationAt||'';
        const live=await fetch(new URL('./data/amorist-data.json',document.baseURI).href+
          '?check='+Date.now(),{cache:'no-store'});
        if(!live.ok)throw new Error('无法验证公开版本，已停止发布');
        const data=await live.json();
        if(expected && String(data.exportedAt||'')!==String(expected))
          throw new Error('公开内容已经更新，版本与本机初始数据不符，请先核对后发布');
        baseline=before.sha;
        localStorage.setItem(BASE_SHA_KEY,baseline);
      }
      status('正在整理本机档案与新增图片…');
      const {payload,keys,images}=await preparePublication();
      if(!keys)throw new Error('没有发现可发布的本地资料；请先检查是否成功导入原档案');
      if(images.length) {
        status('需要同步 '+images.length+' 张新图片…');
        for(let i=0;i<images.length;i++){
          const [filePath,b64]=images[i];
          const existing=await api('GET',filePath);
          if(!existing){
            await api('PUT',filePath,{
              message:'Amorist mobile: add image '+(i+1)+'/'+images.length,
              content:b64,branch:branch()
            });
          }
          status('已同步图片 '+(i+1)+' / '+images.length);
        }
      }
      // Re-check just before replacing published JSON, after potentially long uploads.
      const latest=await validateToken();
      if(latest.sha!==before.sha)
        throw new Error('发布期间远端数据发生了变化。JSON 未覆盖，请核对后重试。');
      const json=JSON.stringify(payload);
      const encoded=bytesToBase64(enc.encode(json));
      status('图片准备完毕，正在提交公开档案 JSON…');
      const result=await api('PUT',DATA_PATH,{
        message:'Amorist mobile: publish personal archive '+payload.exportedAt,
        content:encoded,sha:latest.sha,branch:branch()
      });
      const newSha=result.content?.sha;
      if(!newSha)throw new Error('仓库可能已提交，但没有收到新版本标识。请检查 GitHub 后再操作');
      baseline=newSha;
      localStorage.setItem(BASE_SHA_KEY,newSha);
      localStorage.setItem(VERSION_KEY,payload.exportedAt);
      mobile.lastPublished=payload;
      mobile.hasLocalChanges=false;
      $('#amPublishConfirm').checked=false;
      status('发布成功！已提交 '+keys+' 组档案数据和 '+images.length+' 张新增图片。GitHub Pages 将自动更新。','success');
      toast('Amorist 已发布到 GitHub，公开站将同步更新');
      refresh();
    }catch(error){
      status('发布未完成：'+error.message,'error');
      console.error('Amorist publishing error:',error);
      toast('发布失败，请查看具体原因');
    }finally {
      busy=false;button.textContent='发布最新内容 ↗';updateAuthUI();
    }
  }
  $('#amPublishNow')?.addEventListener('click',()=>publish().catch(err=>{
    status('发布未完成：'+err.message,'error');toast('发布失败：'+err.message);
    busy=false;updateAuthUI();
  }));
  refresh();
  window.AmoristPublisher={refresh,publish,preparePublication};
})();