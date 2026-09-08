import type { Metadata } from 'next';
import Link from 'next/link';

import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE } from '@/lib/catalog';

import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: `Privacy | ${CAMPAIGN_TITLE}`,
  description: 'Simple guidance for sharing a recognition.',
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.decorativeCircle} aria-hidden="true" />
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">Back to live recognitions</Link>
        <header className={styles.header}>
          <p className={styles.kicker}>A clear, short guide</p>
          <h1>{CAMPAIGN_TITLE}</h1>
          <p className={styles.tagline}>{CAMPAIGN_TAGLINE}</p>
        </header>

        <article className={styles.card}>
          <p className={styles.updated}>How to share</p>
          <h2>Share a recognition</h2>
          <p>
            No account is needed. Enter your first name and last initial, the recipient’s first name and last initial, one or more expressions, and a message.
          </p>
          <p>
            Your name is visible to campaign administrators and is not shown publicly. The recipient, selected expressions, and message may appear on the home page and TV after basic checks.
          </p>

          <section>
            <h3>Leave out private details</h3>
            <p>
              Avoid health details, personal disagreements, contact information, or anything the recipient would prefer to keep private.
            </p>
          </section>

          <section>
            <h3>If your message needs review</h3>
            <p>
              A message may be held for review before it appears. An administrator may remove a sensitive detail before publication.
            </p>
          </section>

        </article>

        <p className={styles.footer}>Return to the <Link href="/recognize">recognition form</Link> when you are ready.</p>
      </div>
    </main>
  );
}
