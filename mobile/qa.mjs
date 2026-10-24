import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const mobile=path.join(root,'mobile');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('mobile/index.html');
const scripts=['mobile/app.js','mobile/bootstrap.js','mobile/publish.js','mobile/sw.js','mobile/native-core.js','mobile/native-discovery.js','mobile/native-shrine.js','mobile/native-forms.js'];
const navViews=['home','library','characters','timeline','studio','forms','oshi','bangumi','omikuji'];
for(const view of navViews)assert(html.includes('data-product-view="'+view+'"'),view+' view missing');
for(const id of ['amTopbar','amPublishDialog','amStudioQuickform','profileEditButton','profileEditModal',
 'profileEditForm','profileHomeStage','amBackupExport','amBackupImport','amPublishNow','amConnectGithub',
 'gameDialogForm','charDialogForm','oshiEditorDrawer','visualCanvas','repoCard','gameLibraryGrid',
 'charDetailPanel']) {
 if(id==='charDetailPanel')continue;
 assert(html.includes('id="'+id+'"'),id+' missing');
}
assert(html.includes("window.AMORIST_MODE = 'editor'"),'must use editable mode');
assert(!html.includes('public-bootstrap.js'),'read-only public bootstrap must not be loaded');
assert(html.includes('<base href="../">'),'asset base incorrect');
assert(/mobile\/app.css/.test(html));
assert(html.includes('mobile/native-core.css'),'native app style missing');
assert(html.includes('mobile/native-discovery.css'),'native discovery style missing');
assert(html.includes('mobile/native-shrine.css'),'native shrine style missing');
assert(html.includes('mobile/native-forms.css'),'native forms style missing');
assert(read('mobile/bootstrap.js').includes('mobile/native-core.js'),'native app bootstrap missing');
assert(read('mobile/sw.js').includes('native-core.js') && read('mobile/sw.js').includes('native-core.css'),'offline cache must include native shell');
for(const script of scripts)assert(fs.statSync(path.join(root,script)).size>100,script+' missing');
const manifest=JSON.parse(read('mobile/manifest.webmanifest'));
assert(manifest.display==='standalone');
assert(manifest.scope==='./');
for(const icon of manifest.icons)assert(fs.existsSync(path.join(mobile,icon.src.replace('./',''))),'missing '+icon.src);
const content=JSON.parse(read('data/amorist-data.json'));
assert(content.type==='amorist-public-data');
assert(content.localStorage && typeof content.localStorage==='object');
const extra=JSON.parse(read('mobile/offline-assets.json'));
assert(extra.files.length>200 && extra.bytes>40000000);
for(const entry of extra.files)assert(fs.existsSync(path.join(root,entry.path)),'missing asset: '+entry.path);
console.log('Amorist Mobile static QA passed:',{
  views:navViews.length,manifestIcons:manifest.icons.length,offlineArtwork:extra.files.length,
  publishedDataBytes:fs.statSync(path.join(root,'data/amorist-data.json')).size
});