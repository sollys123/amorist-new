(() => {
  'use strict';
  const DB_NAME = window.AMORIST_MODE === 'public' ? 'amorist-public-image-store-v1' : 'amorist-image-store-v1';
  const STORE = 'images';
  let dbPromise;
  const open = () => dbPromise || (dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, {keyPath:'id'}); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
  const isRef = value => typeof value === 'string' && value.startsWith('idb-image:');
  const put = value => open().then(db => new Promise((resolve, reject) => {
    const id = `idb-image:${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    if (store.keyPath == null) store.put({id, value}, id);
    else store.put({id, value});
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  }));
  const resolveRef = ref => !isRef(ref) ? Promise.resolve(ref) : open().then(db => new Promise(resolve => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(ref);
    request.onsuccess = () => resolve(request.result?.value || '');
    request.onerror = () => resolve('');
  }));
  const externalize = async value => {
    if (Array.isArray(value)) return Promise.all(value.map(externalize));
    if (value && typeof value === 'object') { const next = {}; for (const [key, item] of Object.entries(value)) next[key] = await externalize(item); return next; }
    if (typeof value === 'string' && /^data:image\//i.test(value)) return put(value);
    return value;
  };
  window.amoristImageStore = {isRef, put, putDataUrl:put, get:resolveRef, resolve:resolveRef, externalize, inline:resolveRef};
})();
