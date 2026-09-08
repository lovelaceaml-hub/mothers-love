import type { Metadata } from 'next';
import Link from 'next/link';

import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE } from '@/lib/catalog';

import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: `Privacy | ${CAMPAIGN_TITLE}`,
  description: 'How recognition sharing works and when personal recognition content expires.',
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.decorativeCircle} aria-hidden="true" />
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">Back to recognition sharing</Link>
        <header className={styles.header}>
          <p className={styles.kicker}>A clear, short guide</p>
          <h1>{CAMPAIGN_TITLE}</h1>
          <p className={styles.tagline}>{CAMPAIGN_TAGLINE}</p>
        </header>

        <article className={styles.card}>
          <p className={styles.updated}>Privacy details</p>
          <h2>What happens when you share a recognition?</h2>
          <p>
            You enter a self-reported name for campaign administrators, the recipient’s first name and last initial, one or more expressions, and a message. There are no member accounts, directory searches, email fields, phone fields, photos, or attachments.
          </p>
          <p>
            The submitted name is kept for administrators and is not part of the public display. The recipient, selected expressions, and message may appear on the campaign display after the basic checks. A message can still reveal its writer through its wording or timing, so public anonymity is not a promise of untraceability.
          </p>

          <section>
            <h3>How long does personal content stay?</h3>
            <p>
              Personal recognition content is kept for seven days, which is 168 hours from submission. The original lifetime does not extend when content is edited, featured, restored, or hidden. Expired personal content is removed through the campaign cleanup process. This page does not promise irreversible erasure from every provider backup because backup behavior depends on the authorized hosting provider.
            </p>
          </section>

          <section>
            <h3>What remains for campaign totals?</h3>
            <p>
              Anonymous daily aggregates can remain after the personal message expires. They count published recognitions and expression selections for their reporting period. They do not identify a person, create unique-member statistics, or retain a link back to the raw message. Held messages contribute no public total until they are published.
            </p>
          </section>

          <section>
            <h3>Who can see what?</h3>
            <p>
              The public display receives only published, valid, unexpired content. Administrators can see the submitted name while the personal record is active. A display browser does not receive submitted names, held messages, private review reasons, or administrator credentials.
            </p>
          </section>

          <section>
            <h3>Children and sensitive details</h3>
            <p>
              Children follow the same name, message, expression, review, and seven-day lifetime rules. Please avoid health details, personal disagreements, contact information, or anything the recipient would prefer to keep private. Messages that need review can be held privately so an administrator can remove a sensitive detail before publication.
            </p>
          </section>

          <section>
            <h3>Display and backups</h3>
            <p>
              A display browser may use an in-memory snapshot while it is connected. If it cannot verify a fresh snapshot for 60 seconds, it falls back to a neutral state. It does not keep a permanent personal cache. Campaign backups may follow the authorized provider’s operational policy. No extra campaign raw snapshots are intentionally shared as a separate archive, and expired personal content is not restored for display without current checks.
            </p>
          </section>

          <section>
            <h3>What we do not provide</h3>
            <p>
              The campaign has no public raw-message export, member directory, leaderboard, ranking, permanent personal archive, or public search page. Totals are for understanding the campaign’s shared expressions, not for measuring individual people.
            </p>
          </section>
        </article>

        <p className={styles.footer}>Return to the <Link href="/">recognition form</Link> when you are ready.</p>
      </div>
    </main>
  );
}
