'use client';

import { useEffect, useState } from 'react';

type WakeLockSentinelLike = {
  release?: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
  standalone?: boolean;
};

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

export function DisplayKioskControl() {
  const [kioskRequested, setKioskRequested] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kiosk = params.get('kiosk') === '1';
    setKioskRequested(kiosk);

    if (!kiosk) {
      return;
    }

    const nav = navigator as NavigatorWithWakeLock;
    const installed =
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches ||
      nav.standalone === true;

    const updateFullscreenState = () => {
      setNeedsGesture(!installed && !document.fullscreenElement);
    };

    updateFullscreenState();
    document.addEventListener('fullscreenchange', updateFullscreenState);

    let wakeLock: WakeLockSentinelLike | null = null;
    let disposed = false;
    const acquireWakeLock = async () => {
      try {
        const lock = await nav.wakeLock?.request('screen') ?? null;
        // The page may have left while the request was pending: let the lock go at once.
        if (disposed) {
          void lock?.release?.();
          return;
        }
        wakeLock = lock;
      } catch {
        // Wake Lock is optional and can be denied by browser or power policy.
      }
    };

    void acquireWakeLock();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      document.removeEventListener('visibilitychange', onVisibility);
      void wakeLock?.release?.();
    };
  }, []);

  if (!kioskRequested || !needsGesture) {
    return null;
  }

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      // Browsers require a user gesture and some embedded contexts may refuse.
    }

    try {
      const orientation = screen.orientation as ScreenOrientationWithLock;
      await orientation.lock?.('landscape');
    } catch {
      // Orientation lock is best effort. The manifest also requests landscape.
    }
  };

  return (
    <button
      type="button"
      onClick={enterFullscreen}
      aria-label="Enter full screen"
      style={{
        position: 'fixed',
        right: '1rem',
        top: '1rem',
        zIndex: 2147483647,
        border: '1px solid rgba(255,255,255,.55)',
        borderRadius: '999px',
        padding: '.72rem 1rem',
        background: 'rgba(22, 20, 30, .72)',
        color: '#fff',
        font: '600 14px/1 system-ui, sans-serif',
        boxShadow: '0 8px 30px rgba(0,0,0,.2)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        cursor: 'pointer',
      }}
    >
      Enter Full Screen
    </button>
  );
}
