import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useEntry } from '../lib/entry-context';
import { usePanelAutoMinimize } from '../lib/use-panel';
import styles from './WordSidebar.module.scss';

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
  const { isDesktop, minimized, expand, minimize, startTimer, stopTimer } = usePanelAutoMinimize();

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
    const h = (e: MouseEvent) => { if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) togglePanel(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
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
      <button className="panel-close" onClick={minimize} aria-label="Mbyll panelin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {related.length > 0 || loading ? (
        <>
          <h2 className={styles.header}>Fjalë të lidhura</h2>
          {loading ? (
            <div className={styles.loading}>Duke u ngarkuar...</div>
          ) : (
            <nav className={styles.list}>
              {related.map(r => (
                <Link
                  key={r.slug}
                  to={`/f/${r.slug}`}
                  className={styles.link}
                  viewTransition
                  onClick={() => { if (window.innerWidth <= 1024) togglePanel(); }}
                >
                  <span className={styles.term}>{r.term}</span>
                  {r.attributes.length > 0 && (
                    <span className={styles.attrs}>{r.attributes.join(', ')}</span>
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
          <h3 className={styles.section}>Përkufizimet</h3>
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
