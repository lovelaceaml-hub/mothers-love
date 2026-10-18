'use client';

import { useSyncExternalStore } from 'react';

// What the TV page is showing right now ('active', 'quiet', 'scheduled' and so
// on), published by ColorPolishHost so siblings on the page, such as the
// background song, can follow it without being remounted with the host's view.
let current = 'checking';
const listeners = new Set<() => void>();

export function publishDisplayPhase(phase: string) {
  if (phase === current) return;
  current = phase;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDisplayPhase(): string {
  return useSyncExternalStore(subscribe, () => current, () => 'checking');
}
