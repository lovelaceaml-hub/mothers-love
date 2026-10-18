'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useDisplayPhase } from './display-phase';

// The campaign song plays softly on a loop behind the TV view (Anthony,
// 2026-10-18). It plays only while the TV shows the campaign normally and
// pauses in quiet, neutral, scheduled and unavailable states. Browsers allow
// sound only after a tap or key press, so a blocked start waits for the first
// one: a tap on the TV, the kiosk's Enter Full Screen button or this button.
// The speaker button turns it on and off, remembered by this browser.
export const DISPLAY_SONG_SRC = '/display/campaign-song.mp3';
const VOLUME = 0.35;
const STORAGE_KEY = 'mothers-love:display-song';
const PLAYING_PHASES = new Set(['active', 'disabled']);

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

// Without storage the choice lasts for this visit only.
let visitChoice: boolean | null = null;
const choiceListeners = new Set<() => void>();

function storeEnabled(enabled: boolean) {
  visitChoice = enabled;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Storage can be unavailable.
  }
  choiceListeners.forEach((listener) => listener());
}

function subscribeChoice(listener: () => void) {
  choiceListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    choiceListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

const enabledSnapshot = () => visitChoice ?? readEnabled();

// Asks the browser to play; reports whether it refused for want of a gesture.
function startPlayback(audio: HTMLAudioElement, onResult: (blocked: boolean) => void) {
  audio.volume = VOLUME;
  audio.play().then(
    () => onResult(false),
    (error: unknown) => {
      if (error instanceof DOMException && error.name === 'NotAllowedError') onResult(true);
    },
  );
}

export function DisplayBackgroundSong() {
  const phase = useDisplayPhase();
  const audioRef = useRef<HTMLAudioElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const enabled = useSyncExternalStore(subscribeChoice, enabledSnapshot, () => true);
  const [available, setAvailable] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const shouldPlay = enabled && available && PLAYING_PHASES.has(phase);

  const tryPlay = useCallback(() => {
    if (audioRef.current) startPlayback(audioRef.current, setBlocked);
  }, []);

  // The source is set after mount, once onError is listening, so a missing
  // file always hides the button.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && !audio.getAttribute('src')) audio.src = DISPLAY_SONG_SRC;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (shouldPlay) startPlayback(audio, setBlocked);
    else audio.pause();
  }, [shouldPlay]);

  // A blocked start retries on the first gesture anywhere on the page. A tap
  // inside the TV's frame is seen here as the window losing focus to it.
  useEffect(() => {
    if (!shouldPlay || !blocked) return;
    const onGesture = (event: Event) => {
      if (event.target instanceof Node && buttonRef.current?.contains(event.target)) return;
      tryPlay();
    };
    const options = { capture: true } as const;
    window.addEventListener('pointerdown', onGesture, options);
    window.addEventListener('keydown', onGesture, options);
    window.addEventListener('blur', onGesture);
    document.addEventListener('fullscreenchange', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture, options);
      window.removeEventListener('keydown', onGesture, options);
      window.removeEventListener('blur', onGesture);
      document.removeEventListener('fullscreenchange', onGesture);
    };
  }, [shouldPlay, blocked, tryPlay]);

  const onButton = () => {
    buttonRef.current?.blur();
    if (enabled && blocked) {
      tryPlay();
      return;
    }
    const next = !enabled;
    storeEnabled(next);
    // Starting inside the tap itself keeps the browser's permission for sound.
    if (next && PLAYING_PHASES.has(phase)) tryPlay();
  };

  const label = !enabled ? 'Music off' : blocked && shouldPlay ? 'Tap to play music' : 'Music on';

  return (
    <>
      <audio
        ref={audioRef}
        loop
        preload="auto"
        data-testid="display-song"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setAvailable(false)}
      />
      {available ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={onButton}
          aria-label={label}
          aria-pressed={enabled}
          title={label}
          data-testid="display-song-toggle"
          data-playing={playing ? 'true' : 'false'}
          style={{
            // The middle of the TV's header strip, clear of the title, the date,
            // the QR card and the kiosk's full screen button.
            position: 'fixed',
            left: '50%',
            top: '1rem',
            transform: 'translateX(-50%)',
            zIndex: 2147483646,
            display: 'flex',
            alignItems: 'center',
            gap: '.45rem',
            border: '1px solid rgba(255,255,255,.55)',
            borderRadius: '999px',
            padding: blocked && shouldPlay ? '.6rem .95rem' : '.6rem',
            background: 'rgba(22, 20, 30, .55)',
            color: '#fff',
            font: '600 14px/1 system-ui, sans-serif',
            opacity: blocked && shouldPlay ? 0.95 : 0.5,
            boxShadow: '0 8px 30px rgba(0,0,0,.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
            {enabled ? (
              <>
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18.5 5.5a9 9 0 0 1 0 13" />
              </>
            ) : (
              <path d="m16 9 5 6m0-6-5 6" />
            )}
          </svg>
          {blocked && shouldPlay ? <span>Tap to play music</span> : null}
        </button>
      ) : null}
    </>
  );
}
