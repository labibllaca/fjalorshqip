const DEFAULT_API = 'https://fjalor.bashk.eu/api';
const STORAGE_KEY = 'api_base';

const input = document.getElementById('api-url');
const saveBtn = document.getElementById('save');
const msg = document.getElementById('msg');

browser.storage.sync.get(STORAGE_KEY).then((data) => {
  input.value = data[STORAGE_KEY] || DEFAULT_API;
});

saveBtn.addEventListener('click', () => {
  let val = input.value.trim().replace(/\/+$/, '');
  if (val && !/^https?:\/\/.+/.test(val)) {
    msg.textContent = 'URL-ja duhet të fillojë me http:// ose https://';
    msg.className = 'msg err';
    return;
  }
  if (!val) val = DEFAULT_API;
  browser.storage.sync.set({ [STORAGE_KEY]: val }).then(() => {
    msg.textContent = 'U ruajt.';
    msg.className = 'msg ok';
  });
});
