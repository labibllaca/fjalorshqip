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
#fjalor-popup {
  position: absolute; z-index: 2147483647;
  background: #fff; color: #1a1a1a;
  border: 1px solid #d1d5db; border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 400px; max-height: 360px; overflow-y: auto;
  padding: 12px 16px;
}
#fjalor-popup .fj-header { font-size: 12px; color: #6b7280; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
#fjalor-popup .fj-entry { margin-bottom: 8px; }
#fjalor-popup .fj-term { font-weight: 600; font-size: 15px; }
#fjalor-popup .fj-attrs { font-weight: 400; color: #6b7280; font-size: 12px; margin-left: 4px; }
#fjalor-popup .fj-defs { margin: 4px 0 0; padding-left: 16px; }
#fjalor-popup .fj-defs li { margin-bottom: 2px; color: #374151; }
#fjalor-popup .fj-empty { color: #9ca3af; font-style: italic; }
@media (prefers-color-scheme: dark) {
  #fjalor-popup { background: #1f2937; color: #f3f4f6; border-color: #374151; }
  #fjalor-popup .fj-header { color: #9ca3af; border-bottom-color: #374151; }
  #fjalor-popup .fj-attrs { color: #9ca3af; }
  #fjalor-popup .fj-defs li { color: #d1d5db; }
  #fjalor-popup .fj-empty { color: #6b7280; }
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

  const el = document.createElement('div');
  el.id = 'fjalor-popup';
  el.innerHTML = buildHTML(word, results);
  document.body.appendChild(el);

  positionPopup(el, rect);
  setupClose(el);
}

function buildHTML(word, results) {
  if (!results || results.length === 0) {
    return `<div class="fj-header">Fjalor: <strong>${esc(word)}</strong></div>
            <div class="fj-empty">Nuk u gjet</div>`;
  }
  let html = `<div class="fj-header">Fjalor: <strong>${esc(word)}</strong></div>`;
  for (const r of results) {
    const attrs = r.attributes && r.attributes.length ? r.attributes.join(', ') : '';
    const defs = r.definitions || [];
    html += `<div class="fj-entry">
      <div class="fj-term">${esc(r.term)} <span class="fj-attrs">${esc(attrs)}</span></div>
      <ul class="fj-defs">${defs.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    </div>`;
  }
  return html;
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

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
