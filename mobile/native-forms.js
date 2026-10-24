/* Native mobile art studio: unified template picker + original full-resolution canvas.
   All eight templates, their editor engines and PNG export stay unchanged. */
(() => {
  'use strict';
  const root=document.querySelector('.product-view[data-product-view="forms"]');
  const source=root?.querySelector('#formTemplates');
  const workspace=root?.querySelector('#formWorkspace');
  if(!root||!source||!workspace)return;
  const app=document.createElement('div');app.className='amf-screen';app.id='amf-screen';
  root.insertBefore(app,root.firstChild);
  const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const svg='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18 15 12 9 6"/></svg>';
  const items=Array.from(source.querySelectorAll('[data-form-template]')).map((el,i)=>({
    key:el.dataset.formTemplate,
    name:el.querySelector('h3')?.textContent?.trim()||'创作模板',
    desc:el.querySelector('p')?.textContent?.trim()||'制作你的图文作品',
    index:i+1,
    code:(el.dataset.formTemplate||'NOTE').toUpperCase()
  }));
  function render(){
    const active=workspace.classList.contains('active');
    root.classList.toggle('amf-active',active);
    if(active){
      app.innerHTML='<div class="amf-edit-bar"><button type="button" data-amf="back" class="amf-back">'+
        '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>'+
        '<span>返回模板</span></button><div><span>CREATION STUDIO</span><h2>编辑图文作品</h2></div></div>'+
        '<div class="amf-preview-hint">下方是作品的原尺寸导出画布。点击画布中的内容进行编辑，保存和导出使用画布下方的工具。</div>';
    }else{
      app.innerHTML='<div class="amf-heading"><span>VISUAL CREATION</span><h1>图文创作</h1><p>选择一张模板，从记录中整理出自己的乙游故事。</p></div>'+
        '<div class="amf-category-head"><h2>选择你的模板</h2><span>'+items.length+' 种创作方式</span></div>'+
        '<div class="amf-template-grid">'+items.map(it=>
          '<button type="button" class="amf-template" data-amf="open" data-key="'+esc(it.key)+'">'+
          '<div class="amf-template-art" data-kind="'+esc(it.key)+'"><div class="amf-template-art-grid">'+
          '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'+
          '<span>'+esc(it.code)+'</span></div>'+
          '<div class="amf-template-content"><strong>'+esc(it.name)+'</strong><p>'+esc(it.desc)+'</p>'+
          '<small>开始制作 '+svg+'</small></div></button>'
        ).join('')+'</div>'+
        '<p class="amf-foot">所有作品图片仍按原设定尺寸与版式导出。</p>';
    }
  }
  app.addEventListener('click',e=>{
    const b=e.target.closest('[data-amf]');if(!b)return;
    if(b.dataset.amf==='back'){root.querySelector('#backToTemplates')?.click();return}
    if(b.dataset.amf==='open'){
      const sourceButton=source.querySelector('[data-form-template="'+b.dataset.key+'"]');
      sourceButton?.click();
      render();
      window.scrollTo({top:0,behavior:'auto'});
    }
  });
  new MutationObserver(render).observe(workspace,{attributes:true,attributeFilter:['class']});
  render();
  window.AmoristNativeForms={render,count:items.length};
})();