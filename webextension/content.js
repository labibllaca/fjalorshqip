chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'result') {
    showPopup(msg.word, msg.results);
  }
});

function injectStyles() {
  if (document.getElementById('fjalor-styles')) return;
  const style = document.createElement('style');
  style.id = 'fjalor-styles';
  style.textContent = `
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('fonts/PlayfairDisplay-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('fonts/PlayfairDisplay-700.woff2') format('woff2');
}
#fjalor-popup {
  position: absolute; z-index: 2147483647;
  background: #f5f5f5; color: #000;
  border: none; border-radius: 0;
  font: 14px/1.7 -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
  max-width: 420px; max-height: 360px; overflow-y: auto;
  padding: 16px 20px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.12);
}
#fjalor-popup .fj-header {
  font: 11px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
  color: #888; letter-spacing: 0.5px; text-transform: uppercase;
  margin-bottom: 12px;
}
#fjalor-popup .fj-entry { margin-bottom: 14px; }
#fjalor-popup .fj-term {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700; font-size: 18px; color: #000;
}
#fjalor-popup .fj-attrs {
  font: 11px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
  text-transform: uppercase; letter-spacing: 0.3px;
  color: #999; margin-left: 6px;
}
#fjalor-popup .fj-defs { margin: 6px 0 0; padding: 0; list-style: none; }
#fjalor-popup .fj-defs li {
  margin-bottom: 4px; color: #000; line-height: 1.7;
  padding-left: 14px; position: relative;
}
#fjalor-popup .fj-defs li::before {
  content: ''; position: absolute; left: 0; top: 10px;
  width: 6px; height: 1px; background: #ccc;
}
#fjalor-popup .fj-empty { color: #bbb; font-style: italic; }
#fjalor-popup a { color: #000; text-decoration: underline; }
@media (prefers-color-scheme: dark) {
  #fjalor-popup { background: #1a1a1a; color: #fff; }
  #fjalor-popup .fj-term { color: #fff; }
  #fjalor-popup .fj-defs li { color: #ddd; }
  #fjalor-popup .fj-defs li::before { background: #555; }
  #fjalor-popup .fj-header { color: #777; }
  #fjalor-popup .fj-empty { color: #666; }
  #fjalor-popup a { color: #fff; }
}
  `;
  document.head.appendChild(style);
}

function showPopup(word, results) {
  removePopup();
  injectStyles();

  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const rect = sel.getRangeAt(0).getBoundingClientRect();

  const el = buildPopup(word, results);
  document.body.appendChild(el);

  positionPopup(el, rect);
  setupClose(el);
}

function buildPopup(word, results) {
  const el = document.createElement('div');
  el.id = 'fjalor-popup';

  const header = document.createElement('div');
  header.className = 'fj-header';
  header.appendChild(document.createTextNode('Fjalor: '));
  const strong = document.createElement('strong');
  strong.textContent = word;
  header.appendChild(strong);
  const date = document.createTextNode(' — ' + new Date().toLocaleDateString('de-DE'));
  header.appendChild(date);
  el.appendChild(header);

  if (!results || results.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fj-empty';
    empty.textContent = 'Nuk u gjet';
    el.appendChild(empty);
    return el;
  }

  for (const r of results) {
    const entry = document.createElement('div');
    entry.className = 'fj-entry';

    const term = document.createElement('div');
    term.className = 'fj-term';
    term.textContent = r.term;
    if (r.attributes && r.attributes.length) {
      const attrs = document.createElement('span');
      attrs.className = 'fj-attrs';
      attrs.textContent = r.attributes.join(', ');
      term.appendChild(attrs);
    }
    entry.appendChild(term);

    const list = document.createElement('ul');
    list.className = 'fj-defs';
    const defs = r.definitions || [];
    for (const d of defs) {
      const li = document.createElement('li');
      li.textContent = d;
      list.appendChild(li);
    }
    entry.appendChild(list);
    el.appendChild(entry);
  }

  return el;
}

function positionPopup(el, rect) {
  const top = rect.bottom + window.scrollY + 4;
  let left = rect.left + window.scrollX;
  if (left + 420 > window.innerWidth + window.scrollX) {
    left = window.innerWidth + window.scrollX - 420;
  }
  el.style.top = top + 'px';
  el.style.left = Math.max(4, left) + 'px';
}

function setupClose(el) {
  const closer = () => { removePopup(); document.removeEventListener('click', closer); };
  document.addEventListener('click', closer);
  el.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { removePopup(); document.removeEventListener('keydown', handler); }
  });
}

function removePopup() {
  const old = document.getElementById('fjalor-popup');
  if (old) old.remove();
}


