(() => {
  'use strict';
  document.body.classList.add('public-mode');

  const blockedSelectors = [
    '#libraryBatchToggle','#libraryBatchAll','#libraryBatchApply','#libraryBatchDelete','#libraryBatchCancel',
    '#addCharButton','#charBatchToggle','#charBatchAll','#charBatchApplyPreference','#charBatchApplyRole','#charBatchDelete','#charBatchCancel',
    '#bangumiDbBatchToggle','#bangumiDbBatchAll','#bangumiDbBatchImport','#bangumiDbBatchCancel','#bangumiDbImport',
    '#bangumiDbManage','#bangumiDbSync','#bangumiDbDetailSync','#bangumiDbImportLocalJson','#bangumiDbExportJson',
    '#libraryCoverUploadButton','#charUploadButton','#charSearchButton',
    '#deleteGameButton','#deleteCharButton','#oshiEditButton','#oshiExportButton','#oshiImportButton','#oshiEditDetailButton','#oshiAddCollection',
    '.timeline-event-actions','[data-timeline-edit]','[data-timeline-delete]',
    '[data-detail-action="log"]','[data-detail-action="edit"]','#gameDetailPanel [data-route]','.game-log-delete','.game-log-date'
  ];
  const blockedSelector = blockedSelectors.join(',');

  function lockField(field) {
    if (field.matches('button,[type="button"],[type="submit"],[type="file"]')) return;
    if (field.matches('select')) {
      field.dataset.publicLocked = 'true';
      field.disabled = true;
      field.setAttribute('aria-readonly', 'true');
      return;
    }
    field.readOnly = true;
    field.setAttribute('aria-readonly', 'true');
  }

  function lockPublicViews() {
    document.querySelectorAll([
      '[data-product-view="profile"] input','[data-product-view="profile"] textarea','[data-product-view="profile"] select',
      '#gameDialogForm input','#gameDialogForm textarea','#gameDialogForm select',
      '#charDialogForm input','#charDialogForm textarea','#charDialogForm select'
    ].join(',')).forEach(lockField);

    document.querySelectorAll(blockedSelector).forEach(node => node.hidden = true);

    const gameSubmit = document.querySelector('#gameDialogForm button[type="submit"]');
    if (gameSubmit) gameSubmit.hidden = true;
    const charSubmit = document.querySelector('#charDialogForm button[type="submit"]');
    if (charSubmit) charSubmit.hidden = true;
  }

  document.addEventListener('click', event => {
    const blocked = event.target.closest(blockedSelector);
    if (blocked) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const lockedSelect = event.target.closest('select[data-public-locked="true"]');
    if (lockedSelect) {
      event.preventDefault();
      lockedSelect.blur();
    }
  }, true);

  document.addEventListener('input', event => {
    if (event.target.closest('[data-product-view="profile"],#gameDialogForm,#charDialogForm')) {
      if (!event.target.matches('#charSearchInput,#bangumiDbSearch,#bangumiDbMaker,#bangumiDbCv,#bangumiDbWriter')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
  }, true);

  const observer = new MutationObserver(lockPublicViews);
  observer.observe(document.body, { childList: true, subtree: true });
  lockPublicViews();

  const site = window.__AMORIST_PUBLIC_DATA__?.site || {};
  if (site.title) document.title = site.title;
})();
