/* Native Amorist Art Studio v3.
 * Original desktop editor replaces the forms section with .workshop-shell.
 * Bind to that ACTUAL engine, not the obsolete #formTemplates markup.
 * Preserve original export canvas, image picker, user templates and saved sheets.
 */
(() => {
  'use strict';
  const root=document.querySelector('.product-view[data-product-view="forms"]');
  const workspace=root?.querySelector('.workshop-shell');
  if(!root||!workspace)return;
  const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const svg=(path)=>'<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
  const back=svg('<path d="m15 18-6-6 6-6"/>');
  const arrow=svg('<path d="m9 18 6-6-6-6"/>');
  const grid=svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>');
  const presets=[
    {key:'free',name:'自由创作',desc:'任意组合图片、文字和配色',title:'我的视觉清单',rows:3,cols:3},
    {key:'nine',name:'九宫格',desc:'把喜欢的九部游戏排成画册',title:'我的九部心选',rows:3,cols:3},
    {key:'tier',name:'Tier 排名',desc:'记录喜好排序与作品梯队',title:'乙游作品 Tier',rows:5,cols:4},
    {key:'characters',name:'角色图鉴',desc:'制作精美的攻略对象展示',title:'我喜欢的角色',rows:3,cols:4},
    {key:'mood',name:'偏好卡片',desc:'用图文总结你的乙游偏好',title:'乙游属性偏好',rows:2,cols:3}
  ];
  const getJSON=(key,otherwise)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||otherwise}catch{return otherwise}};
  const current=()=>getJSON('amorist-workshop-current-v2',null);
  const saved=()=>getJSON('amorist-workshop-sheets-v1',[]);
  const templates=()=>getJSON('amorist-workshop-templates-v1',[]);
  const app=document.createElement('div');app.className='amf-screen';app.id='amf-screen';
  root.insertBefore(app,root.firstChild);
  let editing=false,tool='edit';
  const templateMarkup=(it,type)=>'<button type="button" class="amf-template" data-amf="'+type+'" data-key="'+esc(it.key||it.id)+'">'+
    '<div class="amf-template-art" data-kind="'+esc(it.key||'saved')+'"><div class="amf-template-art-grid">'+
    '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'+
    '<span>'+esc((it.key||'ARCHIVE').toUpperCase().slice(0,15))+'</span></div>'+
    '<div class="amf-template-content"><strong>'+esc(it.name||it.title||'未命名模板')+'</strong>'+
    '<p>'+esc(it.desc||'继续整理一份图文作品')+'</p>'+
    '<small>开始制作 '+arrow+'</small></div></button>';
  function render(){
    root.classList.toggle('amf-active',editing);
    root.classList.remove('amf-tools-edit','amf-tools-size','amf-tools-color','amf-tools-library');
    if(editing)root.classList.add('amf-tools-'+tool);
    if(!editing){
      const last=current(),userTemplates=templates(),userSaved=saved();
      app.innerHTML='<div class="amf-heading"><span>VISUAL CREATION</span><h1>图文创作</h1>'+
        '<p>در ازل پرتوِ حُسنت ز تجلی دَم زد ,عشق پیدا شد و آتش به همه عالم زد</p></div>'+
        (last?'<button type="button" class="amf-resume" data-amf="resume"><span>继续编辑 · '+esc(last.title||'未命名作品')+'</span>'+arrow+'</button>':'')+
        '<div class="amf-category-head"><h2>选择创作方式</h2><span>'+presets.length+' 类基础模板</span></div>'+
        '<div class="amf-template-grid">'+presets.map(it=>templateMarkup(it,'open')).join('')+'</div>'+
        (userTemplates.length?'<div class="amf-category-head amf-extra-head"><h2>我的模板</h2><span>'+userTemplates.length+' 个</span></div>'+
        '<div class="amf-template-grid">'+userTemplates.map(it=>templateMarkup({...it,key:it.id},'open-template')).join('')+'</div>':'')+
        (userSaved.length?'<div class="amf-category-head amf-extra-head"><h2>已保存图表</h2><span>'+userSaved.length+' 份</span></div>'+
        '<div class="amf-template-grid">'+userSaved.map(it=>templateMarkup({...it,key:it.id},'open-saved')).join('')+'</div>':'')+
        '<p class="amf-foot">所有导出图像仍保留原设定的尺寸、排版与清晰度。</p>';
      return;
    }
    app.innerHTML='<div class="amf-edit-bar"><button type="button" data-amf="back" class="amf-back">'+back+'<span>返回模板</span></button>'+
      '<div><span>CREATION STUDIO</span><h2>图文编辑器</h2></div></div>'+
      '<div class="amf-editor-actions">'+
      '<button type="button" data-amf="save">保存作品</button>'+
      '<button type="button" class="amf-export" data-amf="export">导出图片 '+arrow+'</button></div>'+
      '<div class="amf-editor-tabs">'+
      [['edit','画布'],['size','尺寸与布局'],['color','配色'],['library','作品管理']].map(([key,name])=>
        '<button type="button" data-amf="tool" data-value="'+key+'" class="'+(tool===key?'active':'')+'">'+name+'</button>').join('')+'</div>'+
      '<p class="amf-editor-hint">'+
      ({edit:'点击图片格子，可选择游戏、角色或上传素材。',
        size:'编辑宽高、行列、表头以及作品的排版规格。',
        color:'在下方调整作品色彩、主题与边框样式。',
        library:'使用已有模板、已保存的作品或自由创建。'}[tool])+'</p>';
  }
  const setField=(id,value,event='change')=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.value=String(value);
    el.dispatchEvent(new Event(event,{bubbles:true}));
  };
  function startPreset(key){
    const preset=presets.find(x=>x.key===key);
    if(!preset)return;
    const existing=current();
    if(existing?.slots?.some(Boolean)&&!confirm('新建作品会覆盖当前自动保存的草稿。建议先保存作品；确定新建吗？'))return;
    document.getElementById('workshopNew')?.click();
    setField('workshopRows',preset.rows);
    setField('workshopCols',preset.cols);
    setField('workshopTitle',preset.title,'input');
    tool='edit';editing=true;render();
    window.scrollTo({top:0,behavior:'auto'});
  }
  function openStored(type,id){
    const attr=type==='open-saved'?'data-workshop-saved':'data-workshop-template';
    const old=root.querySelector('['+attr+'="'+CSS.escape(id)+'"]');
    if(!old){window.AmoristMobile?.toast?.('该记录暂不可读取，请先在作品管理中检查');return;}
    old.click();editing=true;tool='edit';render();
    window.scrollTo({top:0,behavior:'auto'});
  }
  app.addEventListener('click',event=>{
    const b=event.target.closest('[data-amf]');if(!b)return;
    const op=b.dataset.amf;
    if(op==='back'){editing=false;render();window.scrollTo({top:0,behavior:'auto'});return;}
    if(op==='resume'){editing=true;tool='edit';render();return;}
    if(op==='open'){startPreset(b.dataset.key);return;}
    if(op==='open-saved'||op==='open-template'){openStored(op,b.dataset.key);return;}
    if(op==='save'){document.getElementById('workshopSave')?.click();return;}
    if(op==='export'){document.getElementById('workshopFullscreen')?.click();return;}
    if(op==='tool'){tool=b.dataset.value;render();return;}
  });
  render();
  window.AmoristNativeForms={render,count:presets.length};
})();