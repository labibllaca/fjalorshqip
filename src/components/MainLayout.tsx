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

      <div className="bg-orbs" aria-hidden="true">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
      </div>

      <div className="content">
        <header className="content-header">
          <div className="title-row">
            <a href="/" className="site-title">{pathname === '/des' ? 'Fjal deshiruese' : pathname === '/sot' ? 'Fjala e ditës' : pathname === '/loj' ? 'Gjeje Fjalen' : 'Fjalor'}</a>
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



      <button
        className="fab-ribbon"
        onClick={toggleDrawer}
        aria-label="Hape panelin e detajeve"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
      </button>

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
