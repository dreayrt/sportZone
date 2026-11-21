'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Thin top progress bar shown as soon as the user clicks an internal link,
 * and completed once the URL actually changes. Gives instant feedback even
 * when the next page is slow to render.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
    if (safetyRef.current) clearTimeout(safetyRef.current);
    tickRef.current = hideRef.current = safetyRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (tickRef.current === null && !visible) return;
    clearTimers();
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
  }, [clearTimers, visible]);

  const start = useCallback(() => {
    clearTimers();
    setVisible(true);
    setProgress(12);
    tickRef.current = setInterval(() => {
      setProgress((value) => value + (90 - value) * 0.1);
    }, 200);
    // Never leave the bar hanging if navigation fails or is cancelled.
    safetyRef.current = setTimeout(() => {
      clearTimers();
      setVisible(false);
      setProgress(0);
    }, 12000);
  }, [clearTimers]);

  // URL changed => navigation committed.
  const search = searchParams.toString();
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [start]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease-out' }}
    >
      <div
        className="h-full bg-sport-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? 'none' : 'width 200ms ease-out',
        }}
      />
    </div>
  );
}
