/* Amorist mobile-only Service Worker: never controls the desktop site.
 * Small offline core by default; opt-in complete artwork download.
 */
'use strict';
const VERSION='20261024-v3';
const CORE='amorist-mobile-core-'+VERSION;
const EXTRA='amorist-mobile-artwork-'+VERSION;
const CORE_URLS=[
  './','./index.html','./app.css','./ios-polish.css','./native-core.css','./native-discovery.css','./native-shrine.css','./native-forms.css','./app.js','./ui-icons.js','./native-core.js','./native-discovery.js','./native-shrine.js','./native-forms.js','./bootstrap.js','./publish.js',
  './manifest.webmanifest','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png',
  './offline-assets.json',
  '../assets/css/amorist.css','../assets/css/site-modes.css',
  '../assets/css/polish.css','../assets/css/profile-home.css',
  '../assets/js/image-store.js','../assets/js/data-model.js',
  '../assets/vendor/p5.min.js','../assets/js/torii-p5.js','../assets/js/kotodama-p5.js',
  '../assets/js/amorist-app.js','../assets/js/oshi-hub.js',
  '../data/amorist-data.json','../data/bangumi-games.json','../data/bangumi-meta.json'
];
const coreURLs=CORE_URLS.map(x=>new URL(x,self.registration.scope).href);
const sameOrigin=url=>url.origin===self.location.origin;
const isPublication=url=>/\/data\/(amorist-data|bangumi-games|bangumi-meta)\.json$/.test(url.pathname);

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CORE);
    // Each URL is independent so an unreachable optional resource cannot
    // prevent installation or wipe previously cached content.
    const failures=[];
    for(const href of coreURLs){
      try{
        const response=await fetch(new Request(href,{cache:'reload',credentials:'same-origin'}));
        if(response.ok)await cache.put(href,response);
        else failures.push(href);
      }catch(error){failures.push(href)}
    }
    if(failures.length)console.warn('[Amorist SW] Some offline resources unavailable:',failures.length);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(n=>(n.startsWith('amorist-mobile-core-')||n.startsWith('amorist-mobile-artwork-'))&&
      n!==CORE&&n!==EXTRA).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});
async function tryNetworkFirst(request){
  const cache=await caches.open(CORE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(error){
    const cached=await cache.match(request,{ignoreSearch:true});
    if(cached)return cached;
    throw error;
  }
}
async function tryCacheFirst(request){
  const cached=await caches.match(request,{ignoreSearch:true});
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok){
    const cache=await caches.open(CORE);
    // Online browsing automatically retains used images, not just app code.
    if(/\.(?:png|jpe?g|webp|gif|svg|avif|json|js|css)$/.test(new URL(request.url).pathname))
      cache.put(request,response.clone()).catch(()=>{});
  }
  return response;
}
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(!sameOrigin(url))return;
  if(isPublication(url)){event.respondWith(tryNetworkFirst(request));return}
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try {
        const response=await fetch(request);
        if(response.ok)(await caches.open(CORE)).put(new URL('./index.html',self.registration.scope).href,
          response.clone()).catch(()=>{});
        return response;
      }catch(error){
        const fallback=await caches.match(new URL('./index.html',self.registration.scope).href);
        if(fallback)return fallback;
        throw error;
      }
    })());
    return;
  }
  event.respondWith(tryCacheFirst(request));
});
async function notify(client,message,done=false){
  if(client)client.postMessage({type:'AM_OFFLINE_PROGRESS',message,done});
}
self.addEventListener('message',event=>{
  const command=event.data?.type;
  if(command==='AM_CLEAR_EXTRA'){
    event.waitUntil((async()=>{
      await caches.delete(EXTRA);
      // Keep the essential application and published JSON offline.
      await notify(event.source,'已清理额外下载的离线素材；本机档案未受影响。',true);
    })());
  }
  if(command==='AM_DOWNLOAD_ALL'){
    event.waitUntil((async()=>{
      const client=event.source;
      try {
        const r=await fetch(new URL('./offline-assets.json',self.registration.scope),{cache:'no-store'});
        if(!r.ok)throw new Error('离线资源清单不可用');
        const bundle=await r.json();
        if(!Array.isArray(bundle.files))throw new Error('离线资源清单格式错误');
        const total=bundle.files.length;
        const cache=await caches.open(EXTRA);
        let ok=0,skipped=0,failed=0;
        // Bounded concurrency prevents iOS Safari from exhausting memory.
        const queue=bundle.files.slice();
        const workers=Array.from({length:3},async()=>{
          while(queue.length){
            const file=queue.shift();
            if(!file?.path)continue;
            const url=new URL('../'+file.path,self.registration.scope).href;
            try {
              if(await caches.match(url,{ignoreSearch:true})){skipped++;continue;}
              const response=await fetch(url,{cache:'no-store'});
              if(!response.ok)throw new Error('HTTP '+response.status);
              await cache.put(url,response);
              ok++;
            } catch(error) {failed++;}
            const done=ok+skipped+failed;
            if(done%8===0||done===total)await notify(client,
              '离线素材 '+done+'/'+total+'（新缓存 '+ok+'、已存在 '+skipped+'、失败 '+failed+'）');
          }
        });
        await Promise.all(workers);
        const summary='离线下载完成：新缓存 '+ok+'、已有 '+skipped+'、失败 '+failed+
          '。'+(failed?'可再次点击补齐失败资源。':'已可离线浏览完整素材。');
        await notify(client,summary,true);
      }catch(error){await notify(client,'离线下载失败：'+error.message,true);}
    })());
  }
});
