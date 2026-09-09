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

/**
 * Selects from the canonical catalog in a stable round-robin order. The
 * display coordinator owns the clock, so this view never creates a second
 * rotation timer or chooses an expression by random chance.
 */
export function spotlightExpressionAt(index: number): Expression {
  return EXPRESSIONS[normalizeRotationIndex(index, EXPRESSIONS.length)] ?? EXPRESSIONS[0];
}

export function oneKindWordAt(index: number): string {
  return ONE_KIND_WORD_LINES[normalizeRotationIndex(index, ONE_KIND_WORD_LINES.length)] ?? ONE_KIND_WORD_LINES[0];
}

type TeachingScreenProps = {
  className?: string;
  motion?: DisplayMotion;
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

const FORM_COPY: Record<FormKind, { label: string; title: string; url: string }> = {
  daily: {
    label: 'DAILY CHECK',
    title: 'Daily Check',
    url: DAILY_PRACTICE_URL,
  },
  peace: {
    label: 'PEACE PROMISE',
    title: 'Peace Promise',
    url: PEACE_PROMISE_URL,
  },
};

/**
 * QR destinations are deliberately selected by the screen kind. There is no
 * URL prop and no local data in the link, query string, QR payload, or effect.
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
        <a href={copy.url} target="_blank" rel="noreferrer" aria-label={`Open the ${copy.title} external official form`}>
          {copy.url}
        </a>
      </div>
    </aside>
  );
}

export function ExpressionSpotlight({ expressionIndex = 0, motion = 'standard', className }: RotatingScreenProps) {
  const item = spotlightExpressionAt(expressionIndex);
  const index = normalizeRotationIndex(expressionIndex, EXPRESSIONS.length);

  return (
    <section
      className={screenClasses('spotlightScreen', motion, className)}
      aria-labelledby="expression-spotlight-title"
      data-screen="spotlight"
      data-testid="expression-spotlight"
      data-expression-id={item.id}
      data-rotation-index={index}
    >
      <DecorativeOrb color={item.color} className={styles.spotlightOrb} />
      <div className={styles.spotlightCopy}>
        <p className={styles.teachingKicker}>OFFICIAL EXPRESSION {item.id} OF {EXPRESSIONS.length}</p>
        <h2 id="expression-spotlight-title">Expression spotlight</h2>
        <blockquote className={styles.spotlightPhrase}>
          <span className={styles.quoteMark} aria-hidden="true">“</span>
          {item.phrase}
          <span className={styles.quoteMark} aria-hidden="true">”</span>
        </blockquote>
        <dl className={styles.spotlightDetails}>
          <div>
            <dt>Principle</dt>
            <dd>{item.principle}</dd>
          </div>
          <div>
            <dt>Everyday example</dt>
            <dd>{item.example ?? 'Choose one small, thoughtful action in the moment.'}</dd>
          </div>
        </dl>
      </div>
      <div className={styles.spotlightBadge} aria-label={`Expression ${item.id} of ${EXPRESSIONS.length}`}>
        <span>{String(item.id).padStart(2, '0')}</span>
        <small>of {EXPRESSIONS.length}</small>
      </div>
    </section>
  );
}

export function DailyPractice({ expressionIndex = 0, motion = 'standard', className }: RotatingScreenProps) {
  const item = spotlightExpressionAt(expressionIndex);

  return (
    <section
      className={screenClasses('dailyPracticeScreen', motion, className)}
      aria-labelledby="daily-practice-title"
      data-screen="daily-practice"
      data-testid="daily-practice"
      data-expression-id={item.id}
    >
      <DecorativeOrb color="#ffd86a" className={styles.practiceOrb} />
      <div className={styles.practiceCopy}>
        <p className={styles.teachingKicker}>A SMALL PRACTICE FOR TODAY</p>
        <h2 id="daily-practice-title">Practice one expression.</h2>
        <div className={styles.practiceExpression}>
          <span className={styles.practiceNumber}>0{item.id}</span>
          <blockquote>{item.phrase}</blockquote>
          <p>{item.principle}</p>
        </div>
        <p className={styles.practiceHint}>Try it once, then notice what changes.</p>
      </div>
      <ExternalFormInvitation kind="daily" />
    </section>
  );
}

export function OneKindWord({ wordIndex = 0, motion = 'standard', className }: TeachingScreenProps & { wordIndex?: number }) {
  const index = normalizeRotationIndex(wordIndex, ONE_KIND_WORD_LINES.length);

  return (
    <section
      className={screenClasses('oneKindWordScreen', motion, className)}
      aria-labelledby="one-kind-word-copy"
      data-screen="one-kind-word"
      data-testid="one-kind-word"
      data-word-index={index}
    >
      <span className={styles.wordHalo} aria-hidden="true" />
      <p id="one-kind-word-copy" className={styles.oneKindWordCopy}>{oneKindWordAt(index)}</p>
    </section>
  );
}

const PEACE_SCENES = [
  { id: 'home', label: 'HOME', title: 'Make space to listen.', detail: 'Ask how someone is doing, then stay present.' },
  { id: 'school', label: 'SCHOOL', title: 'Share the turn.', detail: 'Invite another voice into the conversation.' },
  { id: 'work', label: 'WORK', title: 'Name the effort.', detail: 'Thank someone for the care behind the task.' },
] as const;

export function EverydayPeace({ motion = 'standard', className }: TeachingScreenProps) {
  return (
    <section
      className={screenClasses('everydayPeaceScreen', motion, className)}
      aria-labelledby="everyday-peace-title"
      data-screen="everyday-peace"
      data-testid="everyday-peace"
    >
      <div className={styles.everydayPeaceIntro}>
        <p className={styles.teachingKicker}>PEACE IN EVERYDAY PLACES</p>
        <h2 id="everyday-peace-title">Everyday peace starts small.</h2>
        <p>One thoughtful choice can soften the next moment.</p>
      </div>
      <ol className={styles.peaceSceneGrid} aria-label="Tiny everyday peace scenes">
        {PEACE_SCENES.map((scene) => (
          <li key={scene.id}>
            <article className={styles.peaceSceneCard}>
              <div className={classNames(styles.sceneIllustration, styles[`scene${scene.id[0].toUpperCase()}${scene.id.slice(1)}`])} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className={styles.sceneLabel}>{scene.label}</p>
              <h3>{scene.title}</h3>
              <p>{scene.detail}</p>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PeacePromise({ motion = 'standard', className }: TeachingScreenProps) {
  return (
    <section
      className={screenClasses('peacePromiseScreen', motion, className)}
      aria-labelledby="peace-promise-title"
      data-screen="peace-promise"
      data-testid="peace-promise"
    >
      <div className={styles.promiseCopy}>
        <p className={styles.teachingKicker}>A SHARED PROMISE</p>
        <h2 id="peace-promise-title">Carry peace forward.</h2>
        <p>Choose one kind response and let it travel to the next person.</p>
      </div>
      <div className={styles.promiseVisual} aria-hidden="true">
        <span className={styles.promiseHandLeft} />
        <span className={styles.promiseHandRight} />
        <span className={styles.promiseRibbon} />
      </div>
      <ExternalFormInvitation kind="peace" />
    </section>
  );
}
