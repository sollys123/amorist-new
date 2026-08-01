(() => {
  'use strict';
  // Apply read-only presentation before the data bundle finishes loading so
  // editor-only controls never flash on a slow public-page visit.
  document.body.classList.add('public-mode');

  const DATA_URL = './data/amorist-data.json';
  const PREVIEW_KEY = 'amorist-public-preview-v1';
  const MANAGED_PREFIXES = ['amorist-', 'amorist.', 'otomeRepoMaker.'];
  const PUBLIC_TOOL_STORAGE_PREFIX = 'amorist-public-tool:';
  const PUBLIC_TOOL_KEYS = new Set([
    'amorist-game-repos-v1',
    'amorist-form-answers-v1',
    'amorist-visual-sheets-v1',
    'amorist-product-view-v1',
    'amoristUi.productView.v1'
  ]);
  const IGNORED_PUBLISHED_KEYS = new Set(['amorist-anime-library-v1','amorist-media-library-v2']);
  const emptyStorage = {
    'amorist-game-library-v1': '[]',
    'amorist-dashboard-playing-v1': '',
    'amorist-character-book-v1': '[]',
    'amorist-profile-v1': '{}',
    'amorist-game-repos-v1': '{}',
    'amorist-form-answers-v1': '{}',
    'amorist-visual-sheets-v1': '{}',
    'amorist-oshi-hub-v1': '{"version":1,"records":[]}',
    'amorist-workshop-current-v2': '{}',
    'amorist-workshop-sheets-v1': '[]',
    'amorist-workshop-templates-v1': '[]',
    'otomeRepoMaker.themeFavorites.v1': '[]',
    'otomeRepoMaker.colorStyle.v1': 'solid',
    'otomeRepoMaker.activePage.v1': 'full',
    'amorist-timeline-events-v1': '{"version":2,"events":[]}',
    'amorist-bangumi-deleted-v1': '[]',
    'amorist-product-view-v1': 'home'
  };

  const isManagedKey = key => {
    const value=String(key);
    return MANAGED_PREFIXES.some(prefix => value.startsWith(prefix))
      && !value.startsWith(PUBLIC_TOOL_STORAGE_PREFIX)
      && !IGNORED_PUBLISHED_KEYS.has(value);
  };
  const isPublicToolKey = key => String(key).startsWith('otomeRepoMaker.') || PUBLIC_TOOL_KEYS.has(String(key));
  const normalizePayload = value => {
    const payload = value && typeof value === 'object' ? value : {};
    const supplied = payload.localStorage && typeof payload.localStorage === 'object' ? payload.localStorage : {};
    const storage = { ...emptyStorage };
    Object.entries(supplied).forEach(([key, raw]) => {
      if (!isManagedKey(key)) return;
      storage[key] = typeof raw === 'string' ? raw : JSON.stringify(raw);
    });
    try {
      const timeline=JSON.parse(storage['amorist-timeline-events-v1']||'[]');
      const events=Array.isArray(timeline)?timeline:(Array.isArray(timeline?.events)?timeline.events:[]);
      storage['amorist-timeline-events-v1']=JSON.stringify({version:2,events:events.filter(event=>['started','completed','session'].includes(String(event?.type||'')))});
    } catch {
      storage['amorist-timeline-events-v1']='{"version":2,"events":[]}';
    }
    storage['amorist-product-view-v1'] = decodeURIComponent(location.hash.replace(/^#\/?/,'').split('/')[0]||'') === 'timeline' ? 'timeline' : 'home';
    return {
      type: 'amorist-public-data',
      schemaVersion: Number(payload.schemaVersion) || 1,
      dataStructureVersion: Number(payload.dataStructureVersion) || 1,
      exportedAt: payload.exportedAt || '',
      site: payload.site && typeof payload.site === 'object' ? payload.site : {},
      localStorage: storage
    };
  };

  async function loadPayload() {
    const preview = new URLSearchParams(location.search).get('preview') === '1';
    const localRaw = localStorage.getItem(PREVIEW_KEY);
    if (preview) {
      try {
        const raw = localStorage.getItem(PREVIEW_KEY);
        if (raw) return normalizePayload(JSON.parse(raw));
      } catch (error) {
        console.warn('公开站预览数据读取失败', error);
      }
    }
    if (!preview && localRaw) {
      try {
        const localPayload = normalizePayload(JSON.parse(localRaw));
        const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
        if (response.ok) {
          const remotePayload = normalizePayload(await response.json());
          const localTime = Date.parse(localPayload.exportedAt || '');
          const remoteTime = Date.parse(remotePayload.exportedAt || '');
          if (Number.isFinite(localTime) && (!Number.isFinite(remoteTime) || localTime > remoteTime)) return localPayload;
          return remotePayload;
        }
        return localPayload;
      } catch (error) {
        console.warn('Amorist local publication cache skipped:', error);
      }
    }
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return normalizePayload(await response.json());
  }

  function installVirtualStorage(payload) {
    const virtual = payload.localStorage;
    // Public-page interactions may keep a browser-local overlay, but it must be
    // scoped to one publication. A newly generated JSON must never be hidden by
    // an overlay created for an older export.
    const overlayVersion = encodeURIComponent(String(payload.exportedAt || `schema-${payload.schemaVersion || 1}`));
    const publicToolStorageKey = key => `${PUBLIC_TOOL_STORAGE_PREFIX}${overlayVersion}:${String(key)}`;
    const nativeGet = Storage.prototype.getItem;
    const nativeSet = Storage.prototype.setItem;
    const nativeRemove = Storage.prototype.removeItem;
    const nativeClear = Storage.prototype.clear;
    const isLocal = instance => {
      try { return instance === window.localStorage; } catch { return false; }
    };

    Storage.prototype.getItem = function(key) {
      if (isLocal(this) && isPublicToolKey(key)) {
        const overlay=nativeGet.call(this,publicToolStorageKey(key));
        if(overlay!==null)return overlay;
      }
      if (isLocal(this) && isManagedKey(key)) {
        return Object.prototype.hasOwnProperty.call(virtual, key) ? virtual[key] : null;
      }
      return nativeGet.call(this, key);
    };
    Storage.prototype.setItem = function(key, value) {
      if (isLocal(this) && isPublicToolKey(key)) return nativeSet.call(this, publicToolStorageKey(key), value);
      // Keep migrations and derived public-page state alive for this page load.
      // The source JSON remains immutable.
      if (isLocal(this) && isManagedKey(key)) { virtual[key]=String(value); return; }
      return nativeSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function(key) {
      if (isLocal(this) && isPublicToolKey(key)) return nativeRemove.call(this, publicToolStorageKey(key));
      if (isLocal(this) && isManagedKey(key)) { delete virtual[key]; return; }
      return nativeRemove.call(this, key);
    };
    Storage.prototype.clear = function() {
      if (isLocal(this)) return;
      return nativeClear.call(this);
    };
  }

  function showLoadError(error) {
    document.documentElement.classList.add('amorist-public-load-error');
    const banner = document.createElement('div');
    banner.className = 'public-load-banner';
    banner.innerHTML = '<strong>个人档案数据尚未加载</strong><span>请确认 data/amorist-data.json 已上传，并通过本地服务器或 GitHub Pages 打开本站。</span>';
    document.body.prepend(banner);
    console.error('Amorist public data load failed:', error);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  loadPayload()
    .catch(error => {
      showLoadError(error);
      return normalizePayload({});
    })
    .then(async payload => {
      window.__AMORIST_PUBLIC_DATA__ = payload;
      installVirtualStorage(payload);
      await loadScript('./assets/js/amorist-app.js?v=timeline-calendar-20260801-9');
      await loadScript('./assets/js/oshi-hub.js?v=timeline-ui-20260731');
      await loadScript('./assets/js/public-mode.js?v=library-interactions-20260801-8');
    });
})();
