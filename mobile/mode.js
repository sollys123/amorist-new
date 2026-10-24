/* Amorist v4: showcase first. Editing is an explicit, reversible local workspace.
 * Existing editor engines remain initialized so their modal and canvas actions
 * are available immediately when the owner chooses Edit.
 * Publishing is independently protected by GitHub credentials.
 */
(() => {
  'use strict';
  let editing=false;
  const $=selector=>document.querySelector(selector);
  const body=document.body;
  const update=()=>{
    body.classList.toggle('am-mode-viewer',!editing);
    body.classList.toggle('am-mode-editor',editing);
    const toggle=$('#amModeHeader');
    if(toggle){
      toggle.textContent=editing?'完成':'编辑';
      toggle.setAttribute('aria-label',editing?'退出编辑模式，返回展示':'进入个人档案编辑模式');
      toggle.setAttribute('aria-pressed',String(editing));
    }
    const menu=$('#amMoreModeToggle');
    if(menu){
      const title=menu.querySelector('b'),desc=menu.querySelector('small');
      if(title)title.textContent=editing?'返回展示':'进入编辑';
      if(desc)desc.textContent=editing?'保存草稿并查看公开呈现':'编辑档案、人物及记录';
    }
    const top=$('#amOpenPublish');
    if(top)top.hidden=!editing;
    const status=$('#amEditingStatus');
    if(status)status.hidden=!editing;
    if(!editing){
      // Close private owner controls, not the user's actual published records.
      $('#amPublishDialog')?.close?.();
      if($('#oshiEditorDrawer')?.classList.contains('open'))$('#oshiDrawerClose')?.click();
    }
    window.AmoristNativeMobile?.render?.(window.AmoristNativeMobile.state.route);
    window.AmoristNativeDiscovery?.render?.();
    window.AmoristNativeForms?.render?.();
    window.dispatchEvent(new CustomEvent('amorist-mobile-mode-change',{detail:{editing}}));
  };
  const setEditing=next=>{
    if(editing===Boolean(next))return;
    editing=Boolean(next);
    if(!editing && body.classList.contains('amv-legacy-oshi')){
      window.AmoristMobileOshi?.closeAdvanced?.();
    }
    update();
    const sheet=$('#mobileMoreSheet');
    if(sheet&&!sheet.hidden)$('#mobileMoreClose')?.click();
  };
  $('#amModeHeader')?.addEventListener('click',()=>setEditing(!editing));
  $('#amMoreModeToggle')?.addEventListener('click',()=>setEditing(!editing));
  window.AmoristMobileMode=Object.freeze({
    get editing(){return editing},
    isEditing:()=>editing,
    setEditing
  });
  update();
})();