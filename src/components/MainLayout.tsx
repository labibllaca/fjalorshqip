import { useState, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { EntryContext } from '../lib/entry-context';
import type { Entry } from '../lib/dictionary';
import { getCrossRefPref, setCrossRefPref } from '../lib/storage';
import LeftNav from './LeftNav';
import RightPanel from './RightPanel';
import WordSidebar from './WordSidebar';
import './MainLayout.scss';

const MainLayout = () => {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [crossRef, setCrossRef] = useState(() => getCrossRefPref());
  const [slug, setSlug] = useState<string | null>(null);
  const { pathname } = useLocation();

  const handleSetCrossRef = useCallback((v: boolean) => {
    setCrossRef(v);
    setCrossRefPref(v);
  }, []);

  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <EntryContext.Provider value={{ entry, setEntry, crossRef, setCrossRef: handleSetCrossRef, panelOpen: drawerOpen, togglePanel: toggleDrawer, slug, setSlug }}>
      <a id="skip-nav" className="screenreader-text" href="#main-content">
        Kalo navigacionin ose kalo te përmbajtja
      </a>

      {/* Desktop left nav — becomes top bar on mobile via CSS */}
      <LeftNav />

      <div className="content">
        <header className="content-header">
          <div className="title-row">
            <a href="/" className="site-title">{pathname === '/fav' ? 'Fjal deshiruese' : 'Fjalor'}</a>
            <button
              className="drawer-toggle"
              onClick={toggleDrawer}
              aria-label="Aktivizo/çaktivizo panelin e detajeve"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </header>

        <main id="main-content">
          <Outlet />
        </main>
      </div>

      <footer className="content-footer">
        <div className="footer-icons">
          <Link to="/rreth" className="footer-icon" aria-label="Rreth" viewTransition>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <path d="M12 17h.01"/>
            </svg>
          </Link>
          <a href="https://github.com/shqip-dev/fjalorshqip.com" className="footer-icon" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a href="/fjalor-shqip.xpi" className="footer-icon" aria-label="Instalo shtesën për Firefox" download>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </a>
        </div>
        <div>&copy;{new Date().getFullYear()} fjalorshqip.com.</div>
      </footer>

      {pathname === '/' && (
        <RightPanel
          isOpen={drawerOpen}
          onClose={closeDrawer}
        />
      )}
      {pathname.startsWith('/f/') && <WordSidebar />}
    </EntryContext.Provider>
  );
};

export default MainLayout;
