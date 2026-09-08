import type { Metadata } from 'next';
import Link from 'next/link';

import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE, EXPRESSIONS } from '@/lib/catalog';

import styles from './expressions.module.css';

export const metadata: Metadata = {
  title: `Nine expressions | ${CAMPAIGN_TITLE}`,
  description: 'Read the nine expressions and their everyday examples.',
};

function GardenDecorations() {
  return (
    <div className={styles.garden} aria-hidden="true">
      <span className={`${styles.bubble} ${styles.bubbleBlue}`} />
      <span className={`${styles.bubble} ${styles.bubbleCoral}`} />
      <span className={`${styles.bubble} ${styles.bubbleLavender}`} />
      <svg className={styles.leaf} viewBox="0 0 90 90" focusable="false">
        <path d="M78 12C47 15 23 34 19 65c21-1 42-14 59-53Z" fill="currentColor" />
        <path d="M19 65c16-13 28-24 43-39" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className={styles.daisy}>
        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        <b />
      </span>
    </div>
  );
}

export default function ExpressionsPage() {
  return (
    <main className={styles.page}>
      <GardenDecorations />
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">Back to recognition sharing</Link>

        <header className={styles.header}>
          <p className={styles.kicker}>A small guide for everyday peace</p>
          <h1>{CAMPAIGN_TITLE}</h1>
          <p className={styles.tagline}>{CAMPAIGN_TAGLINE}</p>
          <p className={styles.intro}>
            Read the nine expressions and their everyday examples.
          </p>
        </header>

        <section className={styles.content} aria-labelledby="expressions-title">
          <div className={styles.contentHeader}>
            <p className={styles.cardEyebrow}>The nine expressions</p>
            <h2 id="expressions-title">Words that make room for peace</h2>
            <p className={styles.contentIntro}>
              Read each expression&apos;s principle and example.
            </p>
          </div>

          <ol className={styles.expressionList}>
            {EXPRESSIONS.map((expression) => (
              <li key={expression.id}>
                <article className={`${styles.expressionCard} ${styles[`card${expression.id}`]}`}>
                  <div className={styles.cardTopline}>
                    <span className={styles.cardNumber}>{String(expression.id).padStart(2, '0')}</span>
                    <span className={styles.cardLabel}>Expression {expression.id}</span>
                  </div>
                  <h3>“{expression.phrase}”</h3>
                  <p className={styles.principle}>{expression.principle}</p>
                  {expression.example && (
                    <div className={styles.example}>
                      <p className={styles.exampleLabel}>Everyday example</p>
                      <p>{expression.example}</p>
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.sourceCard} aria-labelledby="source-title">
          <p className={styles.cardEyebrow}>Learn more</p>
          <h2 id="source-title">Read the official campaign guidance</h2>
          <p>
            Find more campaign guidance and examples.
          </p>
          <a
            className={styles.sourceLink}
            href="https://heavenlymotherslove.org/en/about"
            target="_blank"
            rel="noreferrer"
          >
            Read the official campaign examples
            <span aria-hidden="true"> ↗</span>
          </a>
        </section>

        <p className={styles.footer}>Ready to recognize someone? <Link href="/">Return to the recognition form</Link>.</p>
      </div>
    </main>
  );
}
