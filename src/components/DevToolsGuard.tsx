import { useEffect, useRef, useState } from 'react';

const CHECK_INTERVAL = 500;
const THRESHOLD = 160;

function detectDevTools(): boolean {
  if (window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) return true;
  return (
    window.outerWidth - window.innerWidth > THRESHOLD ||
    window.outerHeight - window.innerHeight > THRESHOLD
  );
}

const DevToolsGuard = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(() => detectDevTools());
  const warned = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const nowOpen = detectDevTools();
      setOpen(nowOpen);
      if (nowOpen && !warned.current) {
        warned.current = true;
      }
    }, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (!open) return <>{children}</>;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg, #0d1117)',
      color: 'var(--accent, #d53)',
      fontFamily: 'Inter, system-ui, sans-serif',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <h1 style={{
        fontSize: 'clamp(1.25rem, 4vw, 2rem)',
        fontWeight: 600,
        margin: '0 0 0.75rem',
        lineHeight: 1.3,
      }}>
        Mjetet e zhvilluesit u zbuluan
      </h1>
      <p style={{
        fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
        color: 'var(--color-error, #ef4444)',
        maxWidth: 420,
        lineHeight: 1.5,
        margin: 0,
      }}>
        Qasja është e bllokuar për arsye sigurie. Mbyll mjetet e zhvilluesit për të vazhduar.
      </p>
    </div>
  );
};

export default DevToolsGuard;
