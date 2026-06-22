importScripts('./suffixes.js');

const API_BASE = 'https://fjalor.bashk.eu/api';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
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
    const results = await fetchSearch(stem);
    if (results && results.length > 0) {
      chrome.tabs.sendMessage(tabId, { type: 'result', word: word, results });
      return;
    }
  }
  chrome.tabs.sendMessage(tabId, { type: 'result', word: word, results: [] });
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
