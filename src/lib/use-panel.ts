import { useEffect, useRef, useState, useCallback } from 'react';

export function usePanelAutoMinimize() {
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

  const expand = useCallback(() => { setMinimized(false); stopTimer(); }, [stopTimer]);

  useEffect(() => {
    if (!isDesktop) { setMinimized(false); return; }
    startTimer();
    return () => clearTimeout(timerRef.current);
  }, [isDesktop, startTimer]);

  return { isDesktop, minimized, expand, startTimer, stopTimer };
}
