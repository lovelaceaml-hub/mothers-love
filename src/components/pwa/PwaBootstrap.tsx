'use client';

import { useEffect } from 'react';

export function PwaBootstrap() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // PWA support is progressive enhancement. The site must remain usable
        // even when a browser or private mode blocks service workers.
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
