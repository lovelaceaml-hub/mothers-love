'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DisplaySound } from '@/lib/contracts';

type Chime = 'arrival' | 'milestone';

/** Browser audio requires a local gesture; keep one context for the display session. */
export function useDisplayChimes(sound: DisplaySound | undefined, event: { key: string; kind: Chime } | null) {
  const eventKey = event?.key;
  const eventKind = event?.kind;
  const context = useRef<AudioContext | null>(null);
  const played = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const getContext = useCallback(() => {
    if (context.current) return context.current;
    const Audio = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) { setUnsupported(true); return null; }
    const next = new Audio();
    next.onstatechange = () => setReady(next.state === 'running');
    context.current = next;
    return next;
  }, []);
  const enable = useCallback(() => {
    const next = getContext();
    if (next) void next.resume().then(() => setReady(next.state === 'running')).catch(() => setReady(false));
  }, [getContext]);
  useEffect(() => () => {
    const next = context.current;
    if (next) { next.onstatechange = null; void next.close(); }
    context.current = null;
  }, []);
  useEffect(() => {
    if (!eventKey || !eventKind || !sound?.enabled || sound.volume <= 0 || (eventKind === 'arrival' ? !sound.arrivalChime : !sound.milestoneChime)) return;
    if (played.current === eventKey) return;
    played.current = eventKey;
    const next = getContext();
    if (!next || next.state !== 'running') return;
    const oscillator = next.createOscillator();
    const gain = next.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(eventKind === 'milestone' ? 660 : 523.25, next.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(eventKind === 'milestone' ? 880 : 659.25, next.currentTime + 0.22);
    gain.gain.setValueAtTime(0.0001, next.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, Math.min(0.08, sound.volume * 0.2)), next.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, next.currentTime + 0.42);
    oscillator.connect(gain).connect(next.destination);
    oscillator.start();
    oscillator.stop(next.currentTime + 0.45);
    return () => { oscillator.disconnect(); gain.disconnect(); };
  }, [eventKey, eventKind, getContext, sound?.enabled, sound?.arrivalChime, sound?.milestoneChime, sound?.volume]);
  return { ready, unsupported, enable };
}
