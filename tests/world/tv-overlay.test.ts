import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorldTvOverlay } from "@/components/display/world/WorldTvOverlay";
import { sampleWorldFeed } from "@/components/display/world/world-feed";
import { ZONES } from "@/components/display/world/world-data";

/**
 * Plan 28 Section 5: the TV page is now the default for live recognitions, so its ticker, the
 * only screen text that carries names and messages, must be gone in every unsafe state, and
 * the "Fictional sample" mark must never sit on live content.
 */
describe("the TV page's screen text on the privacy path", () => {
  const records = sampleWorldFeed().records;
  // As React writes text into markup, so a message with an apostrophe is still found.
  const escaped = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
  const render = (safe: boolean, sample: boolean) =>
    renderToStaticMarkup(createElement(WorldTvOverlay, {
      zone: ZONES[0], traveling: false, arriving: false, safe, sample, records, fresh: [], reduced: true,
    }));
  it("shows the ticker with every name while the feed is safe", () => {
    const html = render(true, false);
    expect(html).toContain('aria-label="Live recognitions"');
    for (const record of records) {
      expect(html).toContain(escaped(record.recipient));
      expect(html).toContain(escaped(record.message));
    }
  });
  it("renders no ticker, name or message once the feed is unsafe", () => {
    const html = render(false, false);
    expect(html).not.toContain('aria-label="Live recognitions"');
    for (const record of records) {
      expect(html).not.toContain(escaped(record.recipient));
      expect(html).not.toContain(escaped(record.message));
    }
  });
  it("marks sample content as fictional and live content never", () => {
    expect(render(true, true)).toContain("Fictional sample");
    expect(render(true, false)).not.toContain("Fictional sample");
  });
});
