import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE } from "@/lib/catalog";

export default function HomePage() {
  return (
    <main className="campaign-shell">
      <section className="campaign-card" aria-labelledby="campaign-title">
        <header className="campaign-header">
          <p className="campaign-kicker">A place for appreciation</p>
          <h1 id="campaign-title" className="campaign-title">
            {CAMPAIGN_TITLE}
          </h1>
          <p className="campaign-tagline">{CAMPAIGN_TAGLINE}</p>
        </header>

        <div className="opening-panel">
          <div className="opening-copy">
            <h2>The campaign is opening soon.</h2>
            <p>
              We are preparing a safe, simple way to share a word of thanks with someone who has brought
              peace into your day. The recognition form will appear here when collection is ready.
            </p>
          </div>

          <aside className="status-note" aria-label="Campaign status">
            <span className="status-label">Opening status</span>
            <p>Collection is not open yet. No recognition has been submitted or saved.</p>
          </aside>
        </div>

        <footer className="opening-footer">
          <span>One message of appreciation at a time.</span>
          <span>Designed for a calm, welcoming place to share.</span>
        </footer>
      </section>
    </main>
  );
}
