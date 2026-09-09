'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';

import { EXPRESSIONS } from '@/lib/catalog';
import { DISPLAY_EXTERNAL_URLS, type DisplayMotion, type Expression } from '@/lib/contracts';

import styles from './TeachingScreens.module.css';

export const DAILY_PRACTICE_URL = DISPLAY_EXTERNAL_URLS.dailyPractice;
export const PEACE_PROMISE_URL = DISPLAY_EXTERNAL_URLS.peacePromise;

export const ONE_KIND_WORD_LINES = [
  'One Kind Word Heartfelt Change',
  'May Mother’s love bring peace to the world',
  'Today, achieve peace through the ‘Words of Mother’s Love.’',
] as const;

/** The labels are the verified teaching catalog labels, kept local to this lane. */
export const OFFICIAL_TEACHING_LABELS: Readonly<Record<number, string>> = {
  1: 'Greeting',
  2: 'Gratitude',
  3: 'Apology',
  4: 'Inclusiveness',
  5: 'Concession',
  6: 'Respect',
  7: 'Encouragement',
  8: 'Consideration',
  9: 'Compliment',
};

export const SPOTLIGHT_PHASE_TIMINGS = [
  { id: 'wheel', startMs: 0 },
  { id: 'phrase', startMs: 2_400 },
  { id: 'principle', startMs: 5_200 },
  { id: 'example', startMs: 8_200 },
] as const;
export const SPOTLIGHT_PHASE_DURATION_MS = 12_000;
export type SpotlightPhase = (typeof SPOTLIGHT_PHASE_TIMINGS)[number]['id'];

export const DAILY_PRACTICE_PHASE_TIMINGS = [
  { id: 'expression', startMs: 0 },
  { id: 'practice', startMs: 4_200 },
  { id: 'invitation', startMs: 8_000 },
] as const;
export const DAILY_PRACTICE_PHASE_DURATION_MS = 12_000;
export type DailyPracticePhase = (typeof DAILY_PRACTICE_PHASE_TIMINGS)[number]['id'];

export const ONE_KIND_WORD_PHASE_TIMINGS = [
  { id: 'glow', startMs: 0 },
  { id: 'line', startMs: 1_800 },
  { id: 'ripples', startMs: 4_000 },
] as const;
export const ONE_KIND_WORD_PHASE_DURATION_MS = 8_000;
export type OneKindWordPhase = (typeof ONE_KIND_WORD_PHASE_TIMINGS)[number]['id'];

export const EVERYDAY_PEACE_PHASE_TIMINGS = [
  { id: 'home', startMs: 0 },
  { id: 'school', startMs: 8_000 },
  { id: 'work', startMs: 16_000 },
  { id: 'settled', startMs: 22_000 },
] as const;
export const EVERYDAY_PEACE_PHASE_DURATION_MS = 24_000;
export type EverydayPeacePhase = (typeof EVERYDAY_PEACE_PHASE_TIMINGS)[number]['id'];

export const PEACE_PROMISE_PHASE_TIMINGS = [
  { id: 'hands', startMs: 0 },
  { id: 'ribbon', startMs: 3_800 },
  { id: 'invitation', startMs: 7_600 },
] as const;
export const PEACE_PROMISE_PHASE_DURATION_MS = 12_000;
export type PeacePromisePhase = (typeof PEACE_PROMISE_PHASE_TIMINGS)[number]['id'];

const MOTION_CLASSES: Record<DisplayMotion, string> = {
  calm: styles.motionCalm,
  standard: styles.motionStandard,
  lively: styles.motionLively,
  still: styles.motionStill,
};

function classNames(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

function motionClass(motion: DisplayMotion): string {
  return MOTION_CLASSES[motion] ?? styles.motionStandard;
}

export function normalizeRotationIndex(index: number, length: number): number {
  if (!Number.isFinite(index) || length < 1) return 0;
  const wholeIndex = Math.trunc(index);
  return ((wholeIndex % length) + length) % length;
}

export function normalizeElapsedMs(elapsedMs: number | undefined): number {
  if (elapsedMs === undefined || !Number.isFinite(elapsedMs)) return 0;
  return Math.max(0, Math.trunc(elapsedMs));
}

function usePreviewElapsedMs(elapsedMs: number | undefined, durationMs: number): number {
  const isControlled = elapsedMs !== undefined;
  const controlledMs = isControlled ? normalizeElapsedMs(elapsedMs) : undefined;
  const [previewMs, setPreviewMs] = useState(0);

  useEffect(() => {
    if (isControlled) return undefined;

    let frameId = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      setPreviewMs(Math.trunc(now - startedAt) % durationMs);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [durationMs, isControlled]);

  return controlledMs ?? previewMs;
}

function phaseAt<T extends string>(
  elapsedMs: number,
  timings: ReadonlyArray<{ readonly id: T; readonly startMs: number }>,
): T {
  const elapsed = normalizeElapsedMs(elapsedMs);
  let phase = timings[0]?.id;
  for (const timing of timings) {
    if (elapsed < timing.startMs) break;
    phase = timing.id;
  }
  return phase ?? ('' as T);
}

export function spotlightPhaseAt(elapsedMs: number): SpotlightPhase {
  return phaseAt(elapsedMs, SPOTLIGHT_PHASE_TIMINGS);
}

export function dailyPracticePhaseAt(elapsedMs: number): DailyPracticePhase {
  return phaseAt(elapsedMs, DAILY_PRACTICE_PHASE_TIMINGS);
}

export function oneKindWordPhaseAt(elapsedMs: number): OneKindWordPhase {
  return phaseAt(elapsedMs, ONE_KIND_WORD_PHASE_TIMINGS);
}

export function everydayPeacePhaseAt(elapsedMs: number): EverydayPeacePhase {
  return phaseAt(elapsedMs, EVERYDAY_PEACE_PHASE_TIMINGS);
}

export function peacePromisePhaseAt(elapsedMs: number): PeacePromisePhase {
  return phaseAt(elapsedMs, PEACE_PROMISE_PHASE_TIMINGS);
}

/**
 * Selects from the canonical catalog in a stable round-robin order. The
 * display coordinator owns the screen counter, so this view never chooses an
 * expression by random chance or creates a second rotation counter.
 */
export function spotlightExpressionAt(index: number): Expression {
  return EXPRESSIONS[normalizeRotationIndex(index, EXPRESSIONS.length)] ?? EXPRESSIONS[0];
}

export function oneKindWordAt(index: number): string {
  return ONE_KIND_WORD_LINES[normalizeRotationIndex(index, ONE_KIND_WORD_LINES.length)] ?? ONE_KIND_WORD_LINES[0];
}

export function teachingLabelForExpression(id: number): string {
  return OFFICIAL_TEACHING_LABELS[id] ?? 'Expression';
}

export type TeachingScreenProps = {
  className?: string;
  motion?: DisplayMotion;
  /** Parent-controlled elapsed time from the beginning of this screen. */
  elapsedMs?: number;
};

type RotatingScreenProps = TeachingScreenProps & {
  expressionIndex?: number;
};

function screenClasses(variant: string, motion: DisplayMotion, className?: string): string {
  return classNames(styles.teachingScreen, styles[variant], motionClass(motion), className);
}

function DecorativeOrb({ color, className }: { color: string; className?: string }) {
  return <span className={classNames(styles.decorativeOrb, className)} style={{ '--orb-color': color } as CSSProperties} aria-hidden="true" />;
}

type FormKind = 'daily' | 'peace';

const FORM_COPY: Record<FormKind, { label: string; title: string; url: string; prompt: string; notice: string }> = {
  daily: {
    label: 'DAILY CHECK',
    title: 'Daily Check',
    url: DAILY_PRACTICE_URL,
    prompt: 'Scan to open the official Daily Check.',
    notice: 'This opens another site.',
  },
  peace: {
    label: 'PEACE PROMISE',
    title: 'Peace Promise',
    url: PEACE_PROMISE_URL,
    prompt: 'Scan to open the official Supporting Signature form.',
    notice: 'It asks for your details on the official site.',
  },
};

/**
 * QR destinations are selected by the screen kind. There is no URL prop and
 * no local data in the link, query string, QR payload, or effect.
 */
export function ExternalFormInvitation({ kind }: { kind: FormKind }) {
  const copy = FORM_COPY[kind];
  const [qrData, setQrData] = useState<{ url: string; dataUrl: string } | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(copy.url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: { dark: '#3f3551', light: '#fffdf6' },
    })
      .then((dataUrl) => {
        if (active) setQrData({ url: copy.url, dataUrl });
      })
      .catch(() => {
        if (active) setQrData(null);
      });
    return () => {
      active = false;
    };
  }, [copy.url]);

  const qrDataUrl = qrData?.url === copy.url ? qrData.dataUrl : null;

  return (
    <aside className={styles.qrInvitation} aria-label={`${copy.title} external official form`} data-testid={`${kind}-form-invitation`} data-form-url={copy.url}>
      <div className={styles.qrFrame}>
        {qrDataUrl ? (
          // QR data is generated locally from the fixed constant above.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt={`QR code for the ${copy.title} external official form`} />
        ) : (
          <span className={styles.qrPlaceholder} aria-hidden="true">QR</span>
        )}
      </div>
      <div className={styles.qrDetails}>
        <p className={styles.qrKicker}>{copy.label}</p>
        <h3>{copy.title}</h3>
        <p className={styles.qrExternal}>External official form</p>
        <p className={styles.qrPrompt}>{copy.prompt}</p>
        <p className={styles.qrNotice}>{copy.notice}</p>
        <a href={copy.url} target="_blank" rel="noreferrer" aria-label={`Open the ${copy.title} external official form`}>
          {copy.url}
        </a>
      </div>
    </aside>
  );
}

export function ExpressionSpotlight({ expressionIndex = 0, motion = 'standard', elapsedMs, className }: RotatingScreenProps) {
  const clockMs = usePreviewElapsedMs(elapsedMs, SPOTLIGHT_PHASE_DURATION_MS);
  const item = spotlightExpressionAt(expressionIndex);
  const index = normalizeRotationIndex(expressionIndex, EXPRESSIONS.length);
  const phase = spotlightPhaseAt(clockMs);

  return (
    <section
      className={screenClasses('spotlightScreen', motion, className)}
      aria-labelledby="expression-spotlight-title"
      data-screen="spotlight"
      data-testid="expression-spotlight"
      data-expression-id={item.id}
      data-rotation-index={index}
      data-phase={phase}
      data-elapsed-ms={clockMs}
    >
      <div className={styles.spotlightWheel} role="img" aria-label="Nine expression flower wheel">
        <span className={styles.wheelCore} aria-hidden="true" />
        {EXPRESSIONS.map((expression, petalIndex) => (
          <span
            key={expression.id}
            className={classNames(styles.wheelPetal, petalIndex === index && styles.wheelPetalActive)}
            style={{ '--petal-angle': `${petalIndex * 40}deg`, '--petal-reverse-angle': `${-petalIndex * 40}deg`, '--petal-color': expression.color, '--petal-delay': `${petalIndex * 120}ms` } as CSSProperties}
            aria-hidden="true"
          >
            <span>{String(expression.id).padStart(2, '0')}</span>
          </span>
        ))}
      </div>
      <DecorativeOrb color={item.color} className={styles.spotlightOrb} />
      <div className={styles.spotlightCopy}>
        <p className={styles.teachingKicker}>PRACTICE MOTHER&apos;S LOVE</p>
        <p className={styles.spotlightLabel}>{teachingLabelForExpression(item.id)}</p>
        <h2 id="expression-spotlight-title">Expression spotlight</h2>
        <blockquote className={styles.spotlightPhrase}>
          <span className={styles.quoteMark} aria-hidden="true">“</span>
          {item.phrase}
          <span className={styles.quoteMark} aria-hidden="true">”</span>
        </blockquote>
        <div className={styles.spotlightDetails}>
          <section data-detail="principle">
            <h3>Principle</h3>
            <p>{item.principle}</p>
          </section>
          <section data-detail="example">
            <h3>Everyday example</h3>
            <p>{item.example ?? 'Choose one small, thoughtful action in the moment.'}</p>
          </section>
        </div>
      </div>
      <div className={styles.spotlightBadge} aria-label={`Expression ${item.id} of ${EXPRESSIONS.length}`}>
        <span>{String(item.id).padStart(2, '0')}</span>
        <small>of {EXPRESSIONS.length}</small>
      </div>
    </section>
  );
}

export function DailyPractice({ expressionIndex = 0, motion = 'standard', elapsedMs, className }: RotatingScreenProps) {
  const clockMs = usePreviewElapsedMs(elapsedMs, DAILY_PRACTICE_PHASE_DURATION_MS);
  const item = spotlightExpressionAt(expressionIndex);
  const phase = dailyPracticePhaseAt(clockMs);

  return (
    <section
      className={screenClasses('dailyPracticeScreen', motion, className)}
      aria-labelledby="daily-practice-title"
      data-screen="daily-practice"
      data-testid="daily-practice"
      data-expression-id={item.id}
      data-rotation-index={normalizeRotationIndex(expressionIndex, EXPRESSIONS.length)}
      data-phase={phase}
      data-elapsed-ms={clockMs}
    >
      <DecorativeOrb color="#ffd86a" className={styles.practiceOrb} />
      <div className={styles.practiceCopy}>
        <p className={styles.teachingKicker}>A SMALL PRACTICE FOR TODAY</p>
        <h2 id="daily-practice-title">Practice one expression.</h2>
        <div className={styles.practiceExpression}>
          <span className={styles.practiceNumber}>0{item.id}</span>
          <p className={styles.practiceLabel}>{teachingLabelForExpression(item.id)}</p>
          <blockquote>{item.phrase}</blockquote>
          <p>{item.principle}</p>
        </div>
        <p className={styles.practiceHint}>Try it once, then notice what changes.</p>
      </div>
      <ExternalFormInvitation kind="daily" />
    </section>
  );
}

export function OneKindWord({ wordIndex = 0, motion = 'standard', elapsedMs, className }: TeachingScreenProps & { wordIndex?: number }) {
  const clockMs = usePreviewElapsedMs(elapsedMs, ONE_KIND_WORD_PHASE_DURATION_MS);
  const index = normalizeRotationIndex(wordIndex, ONE_KIND_WORD_LINES.length);
  const phase = oneKindWordPhaseAt(clockMs);

  return (
    <section
      className={screenClasses('oneKindWordScreen', motion, className)}
      aria-labelledby="one-kind-word-copy"
      data-screen="one-kind-word"
      data-testid="one-kind-word"
      data-word-index={index}
      data-phase={phase}
      data-elapsed-ms={clockMs}
    >
      <span className={styles.wordHalo} aria-hidden="true" />
      <div className={styles.wordRipples} aria-hidden="true">
        {EXPRESSIONS.map((expression, rippleIndex) => <span key={expression.id} style={{ '--ripple-color': expression.color, '--ripple-delay': `${rippleIndex * 160}ms` } as CSSProperties} />)}
      </div>
      <p id="one-kind-word-copy" className={styles.oneKindWordCopy}>{oneKindWordAt(index)}</p>
    </section>
  );
}

export const EVERYDAY_PEACE_SCENES = [
  { id: 'home', label: 'HOME', title: 'Make space to listen.', detail: 'Ask how someone is doing, then stay present.', expressionId: 1 },
  { id: 'school', label: 'SCHOOL', title: 'Share the turn.', detail: 'Invite another voice into the conversation.', expressionId: 6 },
  { id: 'work', label: 'WORK', title: 'Name the effort.', detail: 'Thank someone for the care behind the task.', expressionId: 2 },
] as const;

export function EverydayPeace({ motion = 'standard', elapsedMs, className }: TeachingScreenProps) {
  const clockMs = usePreviewElapsedMs(elapsedMs, EVERYDAY_PEACE_PHASE_DURATION_MS);
  const phase = everydayPeacePhaseAt(clockMs);
  const activeSceneId = phase === 'settled' ? 'work' : phase;

  return (
    <section
      className={screenClasses('everydayPeaceScreen', motion, className)}
      aria-labelledby="everyday-peace-title"
      data-screen="everyday-peace"
      data-testid="everyday-peace"
      data-phase={phase}
      data-elapsed-ms={clockMs}
    >
      <div className={styles.everydayPeaceIntro}>
        <p className={styles.teachingKicker}>PEACE IN EVERYDAY PLACES</p>
        <h2 id="everyday-peace-title">Everyday peace starts small.</h2>
        <p>One thoughtful choice can soften the next moment.</p>
      </div>
      <ol className={styles.peaceSceneGrid} aria-label="Tiny everyday peace scenes">
        {EVERYDAY_PEACE_SCENES.map((scene) => {
          const expression = EXPRESSIONS.find((candidate) => candidate.id === scene.expressionId) ?? EXPRESSIONS[0];
          const isActive = scene.id === activeSceneId;
          return (
            <li key={scene.id} className={classNames(isActive && styles.peaceSceneItemActive)} data-scene={scene.id} data-scene-active={isActive} aria-hidden={!isActive}>
              <article className={classNames(styles.peaceSceneCard, isActive && styles.peaceSceneCardActive)}>
                <div className={classNames(styles.sceneIllustration, styles[`scene${scene.id[0].toUpperCase()}${scene.id.slice(1)}`])} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p className={styles.sceneLabel}>{scene.label}</p>
                <h3>{scene.title}</h3>
                <p>{scene.detail}</p>
                <div className={styles.sceneExpression}>
                  <span>{teachingLabelForExpression(expression.id)}</span>
                  <blockquote>{expression.phrase}</blockquote>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const PROMISE_HANDS = [
  { x: 16, y: 31, rotate: -26, color: '#8ed6f5' },
  { x: 31, y: 12, rotate: -8, color: '#cdeb76' },
  { x: 51, y: 8, rotate: 7, color: '#ffd86a' },
  { x: 68, y: 18, rotate: 24, color: '#ffaf70' },
  { x: 76, y: 39, rotate: 42, color: '#ef747b' },
  { x: 66, y: 63, rotate: 154, color: '#cbb9f4' },
  { x: 43, y: 72, rotate: 174, color: '#9dd99f' },
  { x: 20, y: 60, rotate: 206, color: '#a5c9ff' },
] as const;

export function PeacePromise({ motion = 'standard', elapsedMs, className }: TeachingScreenProps) {
  const clockMs = usePreviewElapsedMs(elapsedMs, PEACE_PROMISE_PHASE_DURATION_MS);
  const phase = peacePromisePhaseAt(clockMs);

  return (
    <section
      className={screenClasses('peacePromiseScreen', motion, className)}
      aria-labelledby="peace-promise-title"
      data-screen="peace-promise"
      data-testid="peace-promise"
      data-phase={phase}
      data-elapsed-ms={clockMs}
    >
      <div className={styles.promiseCopy}>
        <p className={styles.teachingKicker}>A SHARED PROMISE</p>
        <h2 id="peace-promise-title">Carry peace forward.</h2>
        <p>Choose one kind response and let it travel to the next person.</p>
      </div>
      <div className={styles.promiseVisual} aria-hidden="true">
        <div className={styles.promiseHands}>
          {PROMISE_HANDS.map((hand, index) => (
            <span
              key={`${hand.x}-${hand.y}`}
              className={classNames(
                styles.promiseHand,
                index === 0 && styles.promiseHandLeft,
                index === 1 && styles.promiseHandRight,
              )}
              style={{ '--hand-x': `${hand.x}%`, '--hand-y': `${hand.y}%`, '--hand-rotate': `${hand.rotate}deg`, '--hand-color': hand.color, '--hand-delay': `${-index * 0.18}s` } as CSSProperties}
            />
          ))}
        </div>
        <span className={styles.promiseRibbon} />
        <span className={styles.promiseRing} />
      </div>
      <ExternalFormInvitation kind="peace" />
    </section>
  );
}
