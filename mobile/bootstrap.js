/* Mobile editor bootstrap.
 * The public site loads an immutable published JSON through virtual read-only storage.
 * The mobile app instead imports it ONCE into real local storage, so every existing
 * game/character/repo editor stays functional and all later edits remain private.
 */
(() => {
  'use strict';
  const PUBLISHED_URL = new URL('./data/amorist-data.json', document.baseURI);
  const INIT_KEY = 'am-mobile-init-v2';
  const VERSION_KEY = 'am-mobile-publication-version-v2';
  const SHA_KEY = 'am-mobile-published-sha-v2';
  const BASE_DATA_KEY = 'am-mobile-base-data-v2';
  const MOBILE_KEYS = ['amorist-game-library-v1','amorist-character-book-v1','amorist-profile-v1',
    'amorist-dashboard-playing-v1','amorist-game-repos-v1','amorist-form-answers-v1',
    'amorist-visual-sheets-v1','amorist-oshi-hub-v1','amorist-timeline-events-v1'];
  const app = window.AmoristMobile = window.AmoristMobile || {};
  app.version = '2026.10.24';
  app.publishedUrl = PUBLISHED_URL.href;
  app.repository = 'sollys123/amorist-new';
  app.branch = 'main';
  app.bootstrapError = '';
  app.lastPublished = null;
  app.initialized = Boolean(localStorage.getItem(INIT_KEY));

  const toast = message => {
    const target = document.querySelector('#amMobileToast');
    if (!target) return;
    target.textContent = message;
    target.classList.add('show');
    setTimeout(() => target.classList.remove('show'), 3600);
  };
  app.toast = toast;

  function isPublishableKey(key) {
    return key.startsWith('amorist-') || key.startsWith('amorist.')
      || key.startsWith('amoristUi.') || key.startsWith('otomeRepoMaker.');
  }

  async function downloadPublication() {
    const url = new URL(PUBLISHED_URL.href);
    url.searchParams.set('t', String(Date.now()));
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('公开数据读取失败（HTTP ' + res.status + '）');
    const data = await res.json();
    if (!data || typeof data !== 'object' || data.type !== 'amorist-public-data' || !data.localStorage)
      throw new Error('公开 JSON 数据格式不正确');
    return data;
  }

  function hydratePublished(data) {
    const stored = data.localStorage || {};
    if (!app.initialized) {
      // Import only keys that are absent. Visitor-owned tool drafts must not
      // block all personal profile / library records from being imported.
      let imported = 0, preserved = 0;
      const failed = [];
      for (const [key, raw] of Object.entries(stored)) {
        if (!isPublishableKey(key) || key.startsWith('am-mobile-')) continue;
        if (localStorage.getItem(key) !== null) { preserved++; continue; }
        try {
          const value = typeof raw === 'string' ? raw : JSON.stringify(raw);
          localStorage.setItem(key, window.AmoristDataModel?.normalizeStorageEntry?.(key,value) ?? value);
          imported++;
        } catch (error) {
          failed.push(key);
          console.warn('Published data import failed for', key, error);
        }
      }
      app.importedCount = imported;
      app.existingDraftPreserved = preserved > 0;
      if (failed.length) {
        app.bootstrapError = '部分档案无法存储（' + failed.length + ' 项）';
        toast('部分档案未成功存入本机，请先清理浏览器存储空间并备份现有草稿');
      } else {
        try {
          localStorage.setItem(INIT_KEY, new Date().toISOString());
          localStorage.setItem(VERSION_KEY, String(data.exportedAt || ''));
        } catch (error) {
          app.bootstrapError = '无法保存初始化标记';
          console.warn('Unable to write bootstrap metadata', error);
        }
      }
    }
    app.initialized = true;
    app.lastPublished = data;
    app.remotePublicationAt = data.exportedAt || '';
  }

  async function checkRemoteSha() {
    if (localStorage.getItem(SHA_KEY)) return;
    try {
      const r = await fetch('https://api.github.com/repos/sollys123/amorist-new/contents/data/amorist-data.json?ref=main',
        {headers:{Accept:'application/vnd.github+json'}});
      if (!r.ok) return;
      const j = await r.json();
      if (j.sha) localStorage.setItem(SHA_KEY, j.sha);
    } catch (_) { /* still usable offline */ }
  }

  function loadScript(path) {
    return new Promise((resolve,reject) => {
      const el = document.createElement('script');
      el.src = path; el.async = false;
      el.onload = resolve; el.onerror = () => reject(new Error('资源载入失败：'+path));
      document.body.appendChild(el);
    });
  }

  async function start() {
    try {
      let data;
      try { data = await downloadPublication(); }
      catch (error) {
        app.bootstrapError = String(error.message || error);
        console.warn('Amorist mobile: offline/local startup', error);
        // Installed editor drafts are the authority while offline.
        if (!app.initialized && !MOBILE_KEYS.some(k=>localStorage.getItem(k)!==null)) toast('尚未获取到公开档案；联网后可自动导入');
      }
      if (data) hydratePublished(data);
      else if (localStorage.getItem(INIT_KEY)) app.initialized = true;
      await loadScript('./assets/js/amorist-app.js?v=mobile-editor-20261024');
      await loadScript('./assets/js/oshi-hub.js?v=mobile-editor-20261024');
      await loadScript('./mobile/app.js?v=20261024-1');
      await loadScript('./mobile/native-core.js?v=20261024-v3');
      await loadScript('./mobile/native-discovery.js?v=20261024-v3');
      // Do not let failed metadata lookup block the app.
      checkRemoteSha();
      window.dispatchEvent(new CustomEvent('amorist-mobile-ready'));
    } catch (error) {
      app.bootstrapError = String(error.message || error);
      console.error('Amorist mobile initialization failed:', error);
      const top = document.getElementById('amTopbarTitle');
      if (top) top.textContent = '应用载入失败';
      toast('应用资源加载失败，请联网后刷新');
    }
  }
  start();
})();