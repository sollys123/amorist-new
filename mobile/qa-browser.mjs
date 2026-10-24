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
page.on('pageerror',error=>exceptions.push(error.message));
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
  await page.screenshot({path:path.join(screens,browserName+'-01-home.png'),fullPage:true});

  const views=['library','characters','timeline','oshi','bangumi','omikuji','forms','studio','home'];
  for(const view of views){
    await page.evaluate(v=>window.amoristProductNavigate(v),view);
    await page.waitForTimeout(100);
    const active=await page.locator('.product-view.active').getAttribute('data-product-view');
    assert.equal(active,view,'navigation mismatch: '+view);
    const dimensions=await page.evaluate(()=>({
      documentWidth:document.documentElement.scrollWidth,
      screenWidth:window.innerWidth,
      bodyWidth:document.body.scrollWidth
    }));
    assert(dimensions.documentWidth<=dimensions.screenWidth+4,
      view+' has unexpected horizontal page overflow: '+JSON.stringify(dimensions));
  }

  // iOS regression: the old desktop rank axis squeezed Japanese tier names into
  // a 54 px vertical column, and the grid/list controls became colored Emoji.
  await page.evaluate(()=>window.amoristProductNavigate('library'));
  await page.waitForTimeout(300);
  await page.waitForFunction(()=>document.querySelectorAll('.library-reference-views svg.am-line-icon').length===3,
    null,{timeout:8000});
  const libraryTypography=await page.evaluate(()=>{
    const tier=document.querySelector('.library-rank-tier');
    const title=tier?.querySelector('header h3');
    const toolbar=document.querySelector('.library-reference-toolbar');
    const list=document.querySelector('.library-status-tabs');
    const icons=document.querySelectorAll('.library-reference-views svg.am-line-icon').length;
    return {
      titleWidth:title?.getBoundingClientRect().width || 0,
      titleSize:title?parseFloat(getComputedStyle(title).fontSize):0,
      tierWidth:tier?.getBoundingClientRect().width || 0,
      tierColumns:tier?getComputedStyle(tier).gridTemplateColumns:'',
      toolbarDisplay:toolbar?getComputedStyle(toolbar).display:'',
      filterScrollWidth:list?.scrollWidth || 0,
      filterClientWidth:list?.clientWidth || 0,
      icons
    };
  });
  assert(libraryTypography.titleWidth>65,
    'rank title cramped on mobile: '+JSON.stringify(libraryTypography));
  assert(libraryTypography.titleSize>=16,
    'rank title too small: '+JSON.stringify(libraryTypography));
  assert(libraryTypography.toolbarDisplay==='grid',
    'library must use a mobile toolbar: '+JSON.stringify(libraryTypography));
  assert.equal(libraryTypography.icons,3,'library view controls must be SVG');
  await page.screenshot({path:path.join(screens,browserName+'-01b-library-layout.png'),fullPage:false});
  await page.evaluate(()=>window.amoristProductNavigate('home'));
  await page.waitForTimeout(100);

  await page.locator('#profileEditButton').click();
  await assertVisible('#profileEditModal');
  await page.locator('#profileEditModal [data-profile-key="name"]').fill('QA 手机版档案');
  await page.locator('#profileEditSave').click();
  const savedProfile=await page.evaluate(()=>JSON.parse(localStorage.getItem('amorist-profile-v1')||'{}').name);
  assert.equal(savedProfile,'QA 手机版档案','profile edit did not persist');
  await page.screenshot({path:path.join(screens,browserName+'-02-profile.png'),fullPage:true});

  await page.evaluate(()=>window.amoristProductNavigate('library'));
  await page.waitForTimeout(200);
  const add=page.locator('#libraryAddGameButton');
  await add.waitFor({timeout:15000});
  await add.click();
  await assertVisible('#gameDialogOverlay');
  await page.locator('#libraryGameName').fill('QA 手机版游戏');
  await page.locator('#gameDialogForm button[type="submit"]').click();
  const gameAdded=await page.evaluate(()=>JSON.parse(localStorage.getItem('amorist-game-library-v1')||'[]').some(g=>g.name==='QA 手机版游戏'));
  assert(gameAdded,'new game was not saved');
  await page.screenshot({path:path.join(screens,browserName+'-03-library.png'),fullPage:true});

  await page.evaluate(()=>window.amoristProductNavigate('studio'));
  await page.waitForTimeout(250);
  await assertVisible('#amStudioQuickform');
  await page.locator('#am-field-gameName').fill('手机原生 REPO 编辑同步测试');
  assert.equal(await page.locator('#gameName').inputValue(),'手机原生 REPO 编辑同步测试','REPO input not synced');
  await page.locator('[data-am-studio-mode="canvas"]').click();
  await assertVisible('.product-view[data-product-view="studio"]>.app');
  await page.screenshot({path:path.join(screens,browserName+'-04-repo.png'),fullPage:true});

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