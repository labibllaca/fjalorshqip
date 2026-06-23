const DEFAULT_API = 'https://fjalor.bashk.eu/api';

let API_BASE = DEFAULT_API;

browser.storage.sync.get('api_base').then((data) => {
  API_BASE = data.api_base || DEFAULT_API;
});

browser.storage.onChanged.addListener((changes) => {
  if (changes.api_base) API_BASE = changes.api_base.newValue || DEFAULT_API;
});

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'lookup-fjalor',
    title: 'Fjalor: "%s"',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'lookup-fjalor') return;
  const raw = info.selectionText.trim();
  if (!raw) return;

  const word = normalize(raw);
  searchWord(word, tab.id);
});

async function searchWord(word, tabId) {
  const candidates = tryStrip(word);
  for (const stem of candidates) {
    let results = await fetchSearch(stem);
    if (results && results.length > 0) {
      results = await enrichDefinitions(results);
      chrome.tabs.sendMessage(tabId, { type: 'result', word: word, results });
      return;
    }
  }
  chrome.tabs.sendMessage(tabId, { type: 'result', word: word, results: [] });
}

async function enrichDefinitions(results) {
  return await Promise.all(results.slice(0, 5).map(async (r) => {
    if (r.definitions && r.definitions.length > 0) return r;
    try {
      const res = await fetch(`${API_BASE}/word/${r.slug}`);
      const data = await res.json();
      return data[0] || r;
    } catch {
      return r;
    }
  }));
}

async function fetchSearch(q) {
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
