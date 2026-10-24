import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,webkit} from 'playwright';
const base='http://127.0.0.1:8765/mobile/';
const screens=path.resolve(import.meta.dirname,'qa-screenshots');
fs.mkdirSync(screens,{recursive:true});
const browserName=process.env.AM_QA_BROWSER==='webkit'?'webkit':'chromium';
const browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true,
  ...(browserName==='chromium'?{args:['--no-sandbox']}:{})});
const page=await browser.newPage({
  viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,
  hasTouch:true,locale:'zh-CN',serviceWorkers:'block'
});
const exceptions=[];
page.on('pageerror',error=>{if(exceptions.length<5)exceptions.push(String(error.stack||error.message).slice(0,1100));});
const assertVisible=async selector=>{
  assert(await page.locator(selector).isVisible(),selector+' not visible');
};
try {
  const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  assert(response && response.status()===200,'mobile HTML unavailable');
  await page.waitForFunction(()=>Boolean(window.AmoristMobile?.syncHeader),null,{timeout:45000});
  await page.waitForTimeout(1300);
  assert.equal(await page.locator('.am-bottom-tabs button').count(),5,'five tabs required');
  await page.waitForFunction(()=>document.querySelectorAll('.am-bottom-tabs svg.am-line-icon').length===5,null,{timeout:6000});
  assert.equal(await page.locator('.am-bottom-tabs svg.am-line-icon').count(),5,
    'navigation icons must use SVG, never Unicode/Emoji');
  assertVisible('#amTopbar');
  assertVisible('.am-bottom-tabs');
  const mode=await page.evaluate(()=>window.AMORIST_MODE);
  assert.equal(mode,'editor','mobile viewer must stay editable');
  const viewport=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,
    bottom:Math.round(document.querySelector('.am-bottom-tabs').getBoundingClientRect().bottom)}));
  assert(viewport.scroll<=viewport.width+3,'horizontal overflow on phone');
  assert(viewport.bottom<=844,'bottom nav below screen');
  await page.waitForFunction(()=>Boolean(window.AmoristNativeMobile?.state),null,{timeout:8000});
  await assertVisible('#amv-home .amv-home-hero');
  assert.equal(await page.locator('#amv-home .amv-quick-grid button').count(),3);
  await page.screenshot({path:path.join(screens,browserName+'-01-home.png'),fullPage:false});

  const views=['library','characters','timeline','oshi','bangumi','omikuji','forms','studio','home'];
  for(const v of views){
    await page.evaluate(name=>window.amoristProductNavigate(name),v);
    await page.waitForTimeout(180);
    const active=await page.locator('.product-view.active').getAttribute('data-product-view');
    assert.equal(active,v,'native router mismatch: '+v);
    if(['characters','timeline','oshi','bangumi','forms','omikuji'].includes(v)){
      await page.screenshot({path:path.join(screens,browserName+'-v3-'+v+'.png'),fullPage:false});
    }
    if(['home','library','characters','timeline','oshi'].includes(v)){
      const native=await page.locator('#amv-'+v).isVisible();
      assert(native,'native screen not visible: '+v);
      const legacy=await page.evaluate(name=>{
        const root=document.querySelector('.product-view[data-product-view="'+name+'"]');
        const old=Array.from(root.children).find(c=>!c.classList.contains('amv-screen'));
        return old?getComputedStyle(old).display:'missing';
      },v);
      assert.equal(legacy,'none','desktop page is still visible: '+v);
    }
    const dimensions=await page.evaluate(()=>({
      screen:innerWidth,documentWidth:document.documentElement.scrollWidth
    }));
    assert(dimensions.documentWidth<=dimensions.screen+4,
      'mobile view overflow: '+v+' '+JSON.stringify(dimensions));
  }

  await page.evaluate(()=>window.amoristProductNavigate('library'));
  await assertVisible('#amv-library .amv-metrics');
  assert.equal(await page.locator('#amv-library .amv-filter-scroll button').count(),7);
  await page.locator('#amv-library [data-amv="lib-layout"][data-value="rank"]').click();
  await assertVisible('#amv-library .amv-rank-groups');
  await page.locator('#amv-library [data-amv="lib-layout"][data-value="cover"]').click();
  await assertVisible('#amv-library .amv-game-grid');
  assert.equal(await page.locator('#amv-library .amv-game-grid .amv-game-card').count(),
    await page.evaluate(()=>JSON.parse(localStorage.getItem('amorist-game-library-v1')||'[]').length));
  await page.screenshot({path:path.join(screens,browserName+'-01b-library-native.png'),fullPage:false});
  const firstNativeCard=page.locator('#amv-library .amv-game-grid .amv-game-card').first();
  await firstNativeCard.click();
  await assertVisible('#amv-library .amv-native-detail');
  await page.locator('#amv-library [data-amv="back-games"]').click();
  await assertVisible('#amv-library .amv-game-grid');

  await page.locator('#amv-library [data-amv="new-game"]').click();
  await assertVisible('#gameDialogOverlay');
  await page.locator('#libraryGameName').fill('QA 原生移动端新增作品');
  await page.locator('#gameDialogForm button[type="submit"]').click();
  assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('amorist-game-library-v1')||'[]')
    .some(g=>g.name==='QA 原生移动端新增作品')),'new game did not save');
  await page.evaluate(()=>window.amoristProductNavigate('characters'));
  await assertVisible('#amv-characters .amv-library-controls');
  await page.evaluate(()=>window.amoristProductNavigate('forms'));
  const formsState=await page.evaluate(()=>{
    const root=document.querySelector('.product-view[data-product-view="forms"]');
    const shell=document.getElementById('amf-screen');
    const gallery=document.querySelector('#amf-screen .amf-template-grid');
    const ws=document.getElementById('formWorkspace');
    return {
      loaded:Boolean(window.AmoristNativeForms),
      rootActive:root?.classList.contains('active'),
      rootClass:root?.className,
      shellExists:Boolean(shell),
      shellDisplay:shell?getComputedStyle(shell).display:null,
      galleryExists:Boolean(gallery),
      galleryDisplay:gallery?getComputedStyle(gallery).display:null,
      galleryParent:gallery?.parentNode?.className||'',
      html:shell?.innerHTML.slice(0,550)||'',
      workspaceClass:ws?.className,
      templateFound:Boolean(document.getElementById('formTemplates')),
      templateInside:Boolean(root?.querySelector('#formTemplates')),
      workspaceInside:Boolean(root?.querySelector('#formWorkspace')),
      children:Array.from(root?.children||[]).slice(0,12).map(x=>({id:x.id,tag:x.tagName,className:x.className})),
      globalVisualSheet:Boolean(document.getElementById('visualSheet')),
      globalVisualCanvas:Boolean(document.getElementById('visualCanvas')),
      appScripts:Array.from(document.scripts).filter(x=>x.src.includes('mobile/')).map(x=>x.src.split('/').slice(-1)[0])
    };
  });
  console.log('Native forms state',formsState);
  assert(await page.locator('#amf-screen .amf-template-grid').isVisible(),
    'native forms template gallery missing '+JSON.stringify(formsState));
  assert.equal(await page.locator('#amf-screen [data-amf="open"]').count(),5,'five core workshop templates required; saved and custom templates remain separate');
  await page.locator('#amf-screen [data-amf="open"]').first().click();
  await assertVisible('#workshopSheet');
  await assertVisible('#amf-screen .amf-editor-tabs');
  await assertVisible('#amf-screen .amf-edit-bar');
  await page.locator('#amf-screen [data-amf="tool"][data-value="size"]').click();
  await assertVisible('#workshopRows');
  await page.locator('#amf-screen [data-amf="back"]').click();
  await assertVisible('#amf-screen .amf-template-grid');
  await page.screenshot({path:path.join(screens,browserName+'-v3-forms-native.png'),fullPage:false});
  await page.evaluate(()=>window.amoristProductNavigate('characters'));
  await page.evaluate(()=>window.amoristProductNavigate('omikuji'));
  await assertVisible('#amz-screen .amz-choices');
  assert.equal(await page.locator('#amz-screen .amz-choice').count(),6,'all six shrine rituals must be present');
  const mapHidden=await page.evaluate(()=>getComputedStyle(document.querySelector('#omikujiSanctuary')).display);
  assert.equal(mapHidden,'none','old desktop shrine map should not be visible');
  for(const ritual of [
    {id:'water',panel:'omikujiRitual',back:'omikujiMapBack'},
    {id:'sakura',panel:'sakuraRitual',back:'sakuraMapBack'},
    {id:'bell',panel:'bellRitual',back:'bellMapBack'},
    {id:'ink',panel:'kotodamaRitual',back:'kotodamaMapBack'},
    {id:'ema',panel:'emaRitual',back:'emaMapBack'},
    {id:'torii',panel:'toriiRitual',back:'toriiMapBack'}
  ]){
    await page.locator('#amz-screen [data-amz="'+ritual.id+'"]').click();
    await assertVisible('#'+ritual.panel);
    await page.locator('#'+ritual.back).click();
    await assertVisible('#amz-screen .amz-choices');
  }
  await page.screenshot({path:path.join(screens,browserName+'-v3-shrine-native.png'),fullPage:false});
  await page.evaluate(()=>window.amoristProductNavigate('characters'));
  await page.evaluate(()=>window.amoristProductNavigate('bangumi'));
  await assertVisible('#amx-screen .amx-search');
  await page.evaluate(()=>window.amoristProductNavigate('characters'));
  await page.evaluate(()=>window.amoristProductNavigate('timeline'));
  await assertVisible('#amv-timeline .amv-calendar-panel');
  await page.locator('#amv-timeline [data-amv="timeline-mode"][data-value="feed"]').click();
  await assertVisible('#amv-timeline .amv-feed');
  await page.evaluate(()=>window.amoristProductNavigate('home'));
  await page.locator('#amv-home [data-amv="edit-profile"]').click();

  await assertVisible('#profileEditModal');
  await page.locator('#profileEditModal [data-profile-key="name"]').fill('QA 手机版档案');
  await page.locator('#profileEditSave').click();
  const savedProfile=await page.evaluate(()=>JSON.parse(localStorage.getItem('amorist-profile-v1')||'{}').name);
  assert.equal(savedProfile,'QA 手机版档案','profile edit did not persist');
  await page.screenshot({path:path.join(screens,browserName+'-02-profile.png'),fullPage:false});

  await page.evaluate(()=>window.amoristProductNavigate('library'));
  await page.waitForTimeout(250);
  const gameAdded=await page.evaluate(()=>JSON.parse(localStorage.getItem('amorist-game-library-v1')||'[]').some(g=>g.name==='QA 原生移动端新增作品'));
  assert(gameAdded,'new game was not saved');
  await page.screenshot({path:path.join(screens,browserName+'-03-library.png'),fullPage:false});

  await page.evaluate(()=>window.amoristProductNavigate('studio'));
  await page.waitForTimeout(250);
  await assertVisible('#amStudioQuickform');
  await page.locator('#am-field-gameName').fill('手机原生 REPO 编辑同步测试');
  assert.equal(await page.locator('#gameName').inputValue(),'手机原生 REPO 编辑同步测试','REPO input not synced');
  await page.locator('[data-am-studio-mode="canvas"]').click();
  await assertVisible('.product-view[data-product-view="studio"]>.app');
  await page.screenshot({path:path.join(screens,browserName+'-04-repo.png'),fullPage:false});

  await page.locator('#amOpenPublish').click();
  await assertVisible('#amPublishDialog');
  assert(await page.locator('#amPublishNow').isDisabled(),'publishing must require authenticated opt-in');
  assert.equal(await page.locator('#amGithubToken').inputValue(),'','token should not prefill from local storage');
  await page.locator('[data-am-close="amPublishDialog"]').click();

  const manifest=await page.request.get(base+'manifest.webmanifest');
  assert.equal(manifest.status(),200,'PWA manifest missing');
  const meta=await manifest.json();
  assert(meta.icons.some(i=>i.sizes==='192x192') && meta.icons.some(i=>i.sizes==='512x512'),'PWA icon pair missing');
  const backup=await page.evaluate(()=>window.AmoristMobile.exportBackup());
  assert.equal(backup.type,'amorist-mobile-complete-backup');
  assert(backup.localStorage['amorist-game-library-v1'],'backup missing game data');
  const secretKeys=Object.keys(backup.localStorage).filter(k=>k.includes('github-token')||k.startsWith('am-vault-'));
  assert.equal(secretKeys.length,0,'secret credential included in backup');
  assert.deepEqual(exceptions,[],'uncaught page errors: '+exceptions.join(' | '));
  console.log('Amorist Mobile iPhone-mode browser QA passed',{views:views.length,
    navTabs:5,profileSaved:true,gameSaved:true,repoSync:true,manifest:true,backup:true});
}finally{await browser.close();}