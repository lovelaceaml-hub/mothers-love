'use client';

import { useEffect } from 'react';
import { DISPLAY_BUILD, shouldReload } from '@/lib/display-build';

const CHECK_MS = 5 * 60_000;
const RELOADED_FOR_KEY = 'ml-display-reloaded-for';

function readReloadedFor(): string | null {
  try {
    return window.sessionStorage.getItem(RELOADED_FOR_KEY);
  } catch {
    return null;
  }
}

function writeReloadedFor(build: string) {
  try {
    window.sessionStorage.setItem(RELOADED_FOR_KEY, build);
  } catch {
    // Without storage the two-in-a-row rule still keeps reloads rare.
  }
}

// Reloads the TV page when a new version of the site goes live, so a TV left
// open for weeks picks up new screens without anyone touching the computer.
// A failed check changes nothing: the display keeps running as it is.
export function DisplayBuildWatch() {
  useEffect(() => {
    if (!DISPLAY_BUILD) return;
    let previous: string | null = null;
    let stopped = false;

    const check = async () => {
      let reported: string | null = null;
      try {
        const response = await fetch('/api/display/build', { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } });
        if (response.ok) {
          const body = (await response.json()) as { build?: unknown };
          if (typeof body.build === 'string' && body.build) reported = body.build;
        }
      } catch {
        reported = null;
      }
      if (stopped) return;
      if (shouldReload({ ours: DISPLAY_BUILD, reported, previous, alreadyReloadedFor: readReloadedFor() }) && reported) {
        writeReloadedFor(reported);
        window.location.reload();
        return;
      }
      previous = reported;
    };

    const timer = window.setInterval(() => void check(), CHECK_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
