import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEntry } from '../lib/entry-context';
import { expandAbbr } from '../lib/abbrev';

function firstWords(text: string, n = 4): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const RightPanel = ({ isOpen, onClose }: RightPanelProps) => {
  const { entry } = useEntry();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleClose = () => {
    if (isDesktop) setDismissed(true);
    onClose();
  };

  const handleMouseEnter = () => {
    if (dismissed) setDismissed(false);
  };

  useEffect(() => {
    if (!isDesktop && !isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDesktop && !isOpen) {
          drawerRef.current?.blur();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isDesktop, isOpen, onClose]);

  useEffect(() => {
    if (isDesktop || !isOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDesktop, isOpen, onClose]);

  return (
    <>
      <aside
        ref={drawerRef}
        className={`right-panel ${isOpen ? 'open' : ''} ${dismissed ? 'dismissed' : ''}`}
        aria-label="Detajet dhe veprimet"
        aria-hidden={isDesktop ? undefined : !isOpen}
        tabIndex={-1}
        onMouseEnter={handleMouseEnter}
      >
        <button className="panel-close" onClick={handleClose} aria-label="Mbyll panelin">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className="panel-inner">
          {entry ? (
            <>
              <h2 className="panel-title">{entry.term}</h2>
              {entry.attributes.length > 0 && (
                <div className="panel-attributes">
                  {entry.attributes.map((a) => (
                    <span key={a} className="attr-badge">{expandAbbr(a)}</span>
                  ))}
                </div>
              )}
              <div className="panel-meta">
                <span>{entry.definitions.length} përkufizime</span>
              </div>
              {entry.definitions.length > 0 && (
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
                        if (!isDesktop) onClose();
                      }}
                    >
                      {i + 1}. {firstWords(def)}
                    </a>
                  ))}
                </nav>
              )}
            </>
          ) : (
            <>
              <h2 className="panel-title">Fjalor Shqip</h2>
              <p className="panel-text">
                Fjalor i gjuhës shqipe me mijëra fjalë dhe përkufizime.
              </p>
            </>
          )}
          <div className="footer-icons">
            <Link to="/rreth" className="footer-icon" aria-label="Rreth" viewTransition>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <path d="M12 17h.01"/>
              </svg>
            </Link>
            <a href="/fjalor-shqip.xpi" className="footer-icon" aria-label="Instalo shtesën për Firefox" download>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};

export default RightPanel;
