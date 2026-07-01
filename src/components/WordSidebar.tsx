import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useEntry } from '../lib/entry-context';
import './WordSidebar.scss';

interface RelatedEntry {
  slug: string;
  term: string;
  attributes: string[];
}

const WordSidebar = () => {
  const { slug, panelOpen, togglePanel, entry } = useEntry();
  const [related, setRelated] = useState<RelatedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const startTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    if (isDesktop) timerRef.current = setTimeout(() => setMinimized(true), 15000);
  }, [isDesktop]);

  const stopTimer = useCallback(() => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (!isDesktop) { setMinimized(false); return; }
    startTimer();
    return () => clearTimeout(timerRef.current);
  }, [isDesktop, slug, startTimer]);

  const expand = () => {
    setMinimized(false);
    stopTimer();
  };

  useEffect(() => {
    if (!slug) { setRelated([]); return; }
    setLoading(true);
    fetch(`/api/word/${encodeURIComponent(slug)}/related`)
      .then(res => res.json())
      .then(data => { setRelated(data); setLoading(false); })
      .catch(() => { setRelated([]); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (window.innerWidth > 1024 || !panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        togglePanel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen, togglePanel]);

  return (
    <aside
      ref={sidebarRef}
      className={`ribbon-card ${panelOpen ? 'open' : ''} ${minimized ? 'minimized' : ''}`}
      aria-label="Fjalë të lidhura"
      onClick={minimized ? expand : undefined}
      onMouseEnter={minimized ? expand : stopTimer}
      onMouseLeave={startTimer}
    >
      <div className="panel-mini-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
      </div>
      <button className="panel-close" onClick={() => togglePanel()} aria-label="Mbyll panelin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {related.length > 0 || loading ? (
        <>
          <h2 className="word-sidebar-header">Fjalë të lidhura</h2>
          {loading ? (
            <div className="word-sidebar-loading">Duke u ngarkuar...</div>
          ) : (
            <nav className="word-sidebar-list">
              {related.map(r => (
                <Link
                  key={r.slug}
                  to={`/f/${r.slug}`}
                  className="word-sidebar-link"
                  viewTransition
                  onClick={() => { if (window.innerWidth <= 1024) togglePanel(); }}
                >
                  <span className="word-sidebar-term">{r.term}</span>
                  {r.attributes.length > 0 && (
                    <span className="word-sidebar-attrs">{r.attributes.join(', ')}</span>
                  )}
                </Link>
              ))}
            </nav>
          )}
        </>
      ) : null}
      {entry && entry.definitions.length > 0 && (
        <>
          <hr className="panel-divider" />
          <h3 className="word-sidebar-section">Përkufizimet</h3>
          <nav className="panel-toc">
            {entry.definitions.map((def, i) => (
              <a
                key={i}
                href={`#def-0-${i}`}
                className="panel-toc-link"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(`def-0-${i}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    el.style.animation = 'pulse 0.8s ease-in-out 3.75';
                    setTimeout(() => el.style.animation = '', 3000);
                  }
                  if (window.innerWidth <= 1024) togglePanel();
                }}
              >
                {i + 1}. {def.split(/\s+/).slice(0, 3).join(' ')}
              </a>
            ))}
          </nav>
        </>
      )}
    </aside>
  );
};

export default WordSidebar;
