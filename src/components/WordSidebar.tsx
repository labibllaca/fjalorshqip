import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEntry } from '../lib/entry-context';
import './WordSidebar.scss';

interface RelatedEntry {
  slug: string;
  term: string;
  attributes: string[];
}

const WordSidebar = () => {
  const { slug, panelOpen, togglePanel } = useEntry();
  const [related, setRelated] = useState<RelatedEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) { setRelated([]); return; }
    setLoading(true);
    fetch(`/api/word/${encodeURIComponent(slug)}/related`)
      .then(res => res.json())
      .then(data => { setRelated(data); setLoading(false); })
      .catch(() => { setRelated([]); setLoading(false); });
  }, [slug]);

  return (
    <aside
      className={`word-sidebar ${panelOpen ? 'open' : ''}`}
      aria-label="Fjalë të lidhura"
    >
      <button className="panel-close" onClick={() => togglePanel()} aria-label="Mbyll panelin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <h2 className="word-sidebar-header">Fjalë të lidhura</h2>

      {loading ? (
        <div className="word-sidebar-loading">Duke u ngarkuar...</div>
      ) : related.length === 0 ? (
        <div className="word-sidebar-empty">Nuk u gjetën fjalë të lidhura</div>
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
    </aside>
  );
};

export default WordSidebar;
