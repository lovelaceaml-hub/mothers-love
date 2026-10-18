import type { Frame } from '@playwright/test';
import { buildActiveDisplayFixture, recognition } from './helpers';

/**
 * Counts grapheme clusters (what a person would call "characters"), not UTF-16
 * code units. A message built from JS .length would overcount multi-codepoint
 * graphemes (e.g. an emoji plus a skin-tone modifier is 4 UTF-16 units but one
 * grapheme), which is why every "N graphemes" message below is built and
 * measured with Intl.Segmenter, per the September 18 plan-critique addendum.
 * Called by welcome.spec.ts, orbit.spec.ts and milestone.spec.ts.
 */
export function graphemeCount(text: string): number {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  let count = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ of segmenter.segment(text)) count++;
  return count;
}

/**
 * Returns the first `count` grapheme clusters of `text`, never splitting a
 * cluster. Called by buildGraphemeMessage below.
 */
function graphemeSlice(text: string, count: number): string {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const parts: string[] = [];
  for (const piece of segmenter.segment(text)) {
    if (parts.length >= count) break;
    parts.push(piece.segment);
  }
  return parts.join('');
}

const FIXTURE_SENTENCE =
  'Thank you for your steady kindness and quiet strength, for showing up again and again with patience, warmth, and encouragement that carries this whole community forward every single day. ';

/**
 * Builds a fictional message with exactly `targetGraphemes` grapheme
 * clusters by repeating a sentence and trimming on a grapheme boundary.
 * Called below to build the 250/400/500 grapheme and medium fixture messages.
 */
export function buildGraphemeMessage(targetGraphemes: number): string {
  let text = '';
  while (graphemeCount(text) < targetGraphemes) {
    text += FIXTURE_SENTENCE;
  }
  return graphemeSlice(text, targetGraphemes);
}

/** The product maximum: a fictional 500 grapheme message. */
export const MOSTLY_LONG_MESSAGE_500 = buildGraphemeMessage(500);
/** A fictional 400 grapheme message. */
export const MOSTLY_LONG_MESSAGE_400 = buildGraphemeMessage(400);
/** A fictional 250 grapheme message, half the 500 grapheme product limit. */
export const MOSTLY_LONG_MESSAGE_250 = buildGraphemeMessage(250);
/**
 * A fictional message containing a multi-codepoint grapheme cluster (a
 * thumbs-up emoji plus a skin-tone modifier: two code points, one grapheme),
 * so grapheme count and JS string length differ for this record.
 */
export const MOSTLY_LONG_MESSAGE_EMOJI =
  'Thank you for the biggest high five \u{1F44D}\u{1F3FD} and the warmest welcome to our whole family this week and every week that follows.';

if (graphemeCount(MOSTLY_LONG_MESSAGE_500) !== 500) {
  throw new Error(`MOSTLY_LONG_MESSAGE_500 has ${graphemeCount(MOSTLY_LONG_MESSAGE_500)} graphemes, expected 500`);
}
if (graphemeCount(MOSTLY_LONG_MESSAGE_400) !== 400) {
  throw new Error(`MOSTLY_LONG_MESSAGE_400 has ${graphemeCount(MOSTLY_LONG_MESSAGE_400)} graphemes, expected 400`);
}
if (graphemeCount(MOSTLY_LONG_MESSAGE_250) !== 250) {
  throw new Error(`MOSTLY_LONG_MESSAGE_250 has ${graphemeCount(MOSTLY_LONG_MESSAGE_250)} graphemes, expected 250`);
}
if (MOSTLY_LONG_MESSAGE_EMOJI.length === graphemeCount(MOSTLY_LONG_MESSAGE_EMOJI)) {
  throw new Error('MOSTLY_LONG_MESSAGE_EMOJI must have a different code-unit length and grapheme count');
}

/**
 * Builds the shared "mostly-long" fixture for Plan 17 Lane 1: six fictional
 * recognitions spanning short, an emoji-bearing, and 250/400/500-grapheme
 * messages. Used identically across welcome.spec.ts, orbit.spec.ts and
 * milestone.spec.ts so the same worst case exercises all three scenes.
 * Called by welcome.spec.ts, orbit.spec.ts and milestone.spec.ts.
 */
export function buildMostlyLongFixture(overrides: Record<string, unknown> = {}) {
  const recognitions = [
    recognition({
      id: 'mostly-short-1',
      recipient: 'Grateful Neighbor',
      message: 'Thank you for your bright smile and quick help today.',
      expressionIds: [1],
      createdAt: '2026-09-10T17:00:00Z',
      firstPublishedAt: '2026-09-10T17:00:00Z',
      expiresAt: '2026-09-17T17:00:00Z',
    }),
    recognition({
      id: 'mostly-short-2',
      recipient: 'Kind Classmate',
      message: 'Thank you for walking me through the hard parts with patience.',
      expressionIds: [9],
      createdAt: '2026-09-10T17:05:00Z',
      firstPublishedAt: '2026-09-10T17:05:00Z',
      expiresAt: '2026-09-17T17:05:00Z',
    }),
    recognition({
      id: 'mostly-emoji',
      recipient: 'Cheerful Friend',
      message: MOSTLY_LONG_MESSAGE_EMOJI,
      expressionIds: [2, 8],
      createdAt: '2026-09-10T17:10:00Z',
      firstPublishedAt: '2026-09-10T17:10:00Z',
      expiresAt: '2026-09-17T17:10:00Z',
    }),
    recognition({
      id: 'mostly-250',
      recipient: 'Steady Supporter',
      message: MOSTLY_LONG_MESSAGE_250,
      expressionIds: [3, 4],
      createdAt: '2026-09-10T17:15:00Z',
      firstPublishedAt: '2026-09-10T17:15:00Z',
      expiresAt: '2026-09-17T17:15:00Z',
    }),
    recognition({
      id: 'mostly-400',
      recipient: 'Devoted Helper',
      message: MOSTLY_LONG_MESSAGE_400,
      expressionIds: [5, 6],
      createdAt: '2026-09-10T17:20:00Z',
      firstPublishedAt: '2026-09-10T17:20:00Z',
      expiresAt: '2026-09-17T17:20:00Z',
    }),
    recognition({
      id: 'mostly-500',
      recipient: 'Community Anchor',
      message: MOSTLY_LONG_MESSAGE_500,
      expressionIds: [7],
      createdAt: '2026-09-10T17:25:00Z',
      firstPublishedAt: '2026-09-10T17:25:00Z',
      expiresAt: '2026-09-17T17:25:00Z',
    }),
  ];

  return buildActiveDisplayFixture({ recognitions, ...overrides });
}

/**
 * The mostly-long fixture reduced to its four long or multi-codepoint
 * records (250, 400 and 500 graphemes plus the emoji message), so a scene
 * with four bubbles (Orbit) mounts every one of them directly instead of
 * depending on which records its seeded selection happens to draw.
 * Called by orbit.spec.ts and welcome.spec.ts.
 */
export function buildLongOnlyFixture(overrides: Record<string, unknown> = {}) {
  const full = buildMostlyLongFixture() as { recognitions: Array<{ id: string }> };
  const keep = new Set(['mostly-emoji', 'mostly-250', 'mostly-400', 'mostly-500']);
  return buildActiveDisplayFixture({ recognitions: full.recognitions.filter((r) => keep.has(r.id)), ...overrides });
}

/** Character lengths of the medium fixture: every one must show whole. */
export const MEDIUM_LENGTHS = [120, 140, 160, 180, 200, 220];
/** Record ids of the medium fixture, "medium-120" to "medium-220". */
export const MEDIUM_IDS = MEDIUM_LENGTHS.map((n) => `medium-${n}`);

/** Record ids of the four short records the medium fixture also carries. */
export const MEDIUM_SHORT_IDS = ['medium-short-1', 'medium-short-2', 'medium-short-3', 'medium-short-4'];

/**
 * Six fictional medium messages, 120 to 220 characters, each with a name
 * and two expression chips: the everyday length that must always show whole
 * on one page. Four short records come with them, because six medium
 * messages side by side outrun the Welcome bubble area (about 1800 px of
 * bubbles for two 913 px rows) and the scene then shows some of them with
 * shorter neighbours. Called by welcome.spec.ts and orbit.spec.ts.
 */
export function buildMediumFixture(overrides: Record<string, unknown> = {}) {
  const shorts = ['Thank you for the warm tea and kind words.', 'Thank you for holding the door with a smile.', 'Thank you for the ride home after choir practice tonight.', 'Thank you for remembering my birthday.'];
  const recognitions = [
    ...MEDIUM_LENGTHS.map((n, i) =>
      recognition({
        id: `medium-${n}`,
        recipient: 'Patient Mentor',
        message: buildGraphemeMessage(n).trimEnd(),
        expressionIds: [(i % 9) + 1, ((i + 4) % 9) + 1],
        createdAt: `2026-09-10T18:0${i}:00Z`,
        firstPublishedAt: `2026-09-10T18:0${i}:00Z`,
        expiresAt: `2026-09-17T18:0${i}:00Z`,
      }),
    ),
    ...shorts.map((message, i) =>
      recognition({
        id: MEDIUM_SHORT_IDS[i],
        recipient: 'Kind Friend',
        message,
        expressionIds: [((i + 2) % 9) + 1],
        createdAt: `2026-09-10T18:1${i}:00Z`,
        firstPublishedAt: `2026-09-10T18:1${i}:00Z`,
        expiresAt: `2026-09-17T18:1${i}:00Z`,
      }),
    ),
  ];
  return buildActiveDisplayFixture({ recognitions, ...overrides });
}

export type TextFitFailure = {
  selector: string;
  reason: string;
  detail?: string;
};

export type TextFitOptions = {
  /** Record ids that must show whole on one page. */
  singlePageIds?: string[];
  /** Required gap between text and a round bubble's rim, as a fraction of its diameter (default 3 percent). */
  rimMargin?: number;
  /** Required gap between text and the rim in layout px, whichever of the two is larger (default 12). */
  rimMarginMin?: number;
  /** Dwell of the scene in seconds for the page ceiling; defaults to the runtime's dwell for the scene. */
  dwellSeconds?: number;
};

/**
 * Asserts, for every visible text run inside `sceneRootSelector` (text with
 * an effective opacity above 0.1, walking every ancestor up to the scene):
 * - the element holding it never scrolls (scrollWidth/scrollHeight within
 *   clientWidth/clientHeight), uses no ellipsis and no line clamp;
 * - every rendered line (measured with a Range, with a spinning bubble's
 *   spin removed for the measurement) sits inside its round bubble's circle
 *   with a gap of at least max(`rimMargin` of the diameter, `rimMarginMin`
 *   layout px) from the rim;
 * - text outside a bubble sits inside its panel box, and a Goal tribute
 *   pearl's text also sits inside the stream panel (.stream-world);
 * - everything sits inside the scene box (overflow hidden) and the viewport;
 * - message text is DRAWN at the 18 px floor or larger (36 px at 3840 wide):
 *   the computed font size times the element's real rendered scale
 *   (getBoundingClientRect().width / offsetWidth), which includes the TV
 *   scale, the depth layer and any orbit or drift scaling;
 * - a bubble showing a page indicator is not one of `singlePageIds`, is the
 *   only paging bubble on screen, and its pages, at core's reading pace
 *   of max(9, characters / 14) seconds each, add up to no more than the
 *   scene's dwell.
 * Returns every failure instead of throwing.
 * Called by welcome.spec.ts, orbit.spec.ts and milestone.spec.ts.
 */
export async function textFits(
  frame: Frame,
  sceneRootSelector: string,
  options: TextFitOptions = {},
): Promise<TextFitFailure[]> {
  return await frame.evaluate(
    ({ rootSelector, singlePageIds, rimMargin, rimMarginMin, dwellSeconds }) => {
      const failures: Array<{ selector: string; reason: string; detail?: string }> = [];
      const root = document.querySelector<HTMLElement>(rootSelector);
      if (!root) return [{ selector: rootSelector, reason: 'scene root not found' }];
      const sceneBox = (root.closest('.scene') as HTMLElement | null) || root;
      const sceneRect = sceneBox.getBoundingClientRect();
      const tv = document.getElementById('tv');
      const tvScale = tv ? tv.getBoundingClientRect().width / 1920 : 1;
      const runtime = (window as any).colorPolishRuntime;
      const state = runtime && typeof runtime.getState === 'function' ? runtime.getState() : null;
      const scene = state ? state.scene : 0;
      const dwell = typeof dwellSeconds === 'number' ? dwellSeconds : state?.visual?.dwell?.[scene] ?? 30;

      const describe = (el: Element): string => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.id) return '#' + htmlEl.id;
        const cls = htmlEl.className;
        const base = typeof cls === 'string' && cls.trim() ? el.tagName.toLowerCase() + '.' + cls.trim().split(/\s+/).join('.') : el.tagName.toLowerCase();
        const owner = el.closest<HTMLElement>('[data-record-id]');
        return owner ? `${base} in ${owner.dataset.recordId}` : base;
      };

      const effectiveOpacity = (el: HTMLElement): number => {
        let node: HTMLElement | null = el;
        let opacity = 1;
        while (node) {
          if (node.hidden) return 0;
          const cs = window.getComputedStyle(node);
          if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
          opacity *= parseFloat(cs.opacity || '1');
          if (node === sceneBox) break;
          node = node.parentElement;
        }
        return opacity;
      };

      const BUBBLE_SELECTORS = ['.orb-slot', '.orbit-sun', '.stream-pearl'];
      const PANEL_SELECTORS = ['.progress-goal', '.progress-milestone', '.progress-rail', '.stream-world', '.progress-sculpture'];
      const closestOf = (el: HTMLElement, selectors: string[]): HTMLElement | null => {
        let node: HTMLElement | null = el;
        while (node) {
          if (selectors.some((sel) => node!.matches(sel))) return node;
          if (node === sceneBox) return null;
          node = node.parentElement;
        }
        return null;
      };
      const outside = (r: DOMRect, box: DOMRect) =>
        r.left < box.left - 0.75 || r.right > box.right + 0.75 || r.top < box.top - 0.75 || r.bottom > box.bottom + 0.75;
      const fmtRect = (r: { left: number; top: number; right: number; bottom: number }) =>
        `[${r.left.toFixed(1)},${r.top.toFixed(1)},${r.right.toFixed(1)},${r.bottom.toFixed(1)}]`;

      // Welcome spins a bubble as it enters or leaves. Rotation about the
      // bubble's centre never moves text relative to its own circle, so each
      // spinning bubble is measured with the spin removed (same position and
      // scale) and restored afterwards, before anything can repaint;
      // bounding boxes of rotated lines would otherwise overstate them.
      const restore: Array<[HTMLElement, string]> = [];
      root.querySelectorAll<HTMLElement>('.orb-slot, .orb-life, .stream-node, .planet-system').forEach((el) => {
        const t = window.getComputedStyle(el).transform;
        if (!t || t === 'none' || t.startsWith('matrix3d')) return;
        const m = new DOMMatrixReadOnly(t);
        if (Math.abs(m.b) < 1e-4 && Math.abs(m.c) < 1e-4) return;
        const k = Math.hypot(m.a, m.b);
        restore.push([el, el.style.transform]);
        el.style.transform = `matrix(${k},0,0,${k},${m.e},${m.f})`;
      });
      // Welcome spins the words (.orb-content) with the rotate property.
      const restoreRotate: Array<[HTMLElement, string]> = [];
      root.querySelectorAll<HTMLElement>('.orb-content').forEach((el) => {
        if (!el.style.rotate) return;
        restoreRotate.push([el, el.style.rotate]);
        el.style.rotate = '0deg';
      });

      type Circle = { cx: number; cy: number; diameter: number; scale: number };
      const circleCache = new Map<HTMLElement, Circle | null>();
      const circleOf = (bubble: HTMLElement): Circle | null => {
        if (circleCache.has(bubble)) return circleCache.get(bubble)!;
        // The circle as drawn: a bubble's life layer carries its entrance
        // scale (core/transitions.js), which grows past full size for a
        // moment with the words inside it, so the slot's resting box would
        // misjudge words that keep their place in the drawn circle.
        const drawn = bubble.querySelector<HTMLElement>(':scope > .orb-life') || bubble;
        const rect = drawn.getBoundingClientRect();
        const circle = rect.width > 0
          ? { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, diameter: Math.min(rect.width, rect.height), scale: drawn.offsetWidth ? rect.width / drawn.offsetWidth : tvScale }
          : null;
        circleCache.set(bubble, circle);
        return circle;
      };
      const farthestCorner = (r: DOMRect, circle: Circle): number =>
        Math.hypot(
          Math.max(Math.abs(r.left - circle.cx), Math.abs(r.right - circle.cx)),
          Math.max(Math.abs(r.top - circle.cy), Math.abs(r.bottom - circle.cy)),
        );
      // Drawn scale of an element: its rendered width over its layout width,
      // read from the bubble that carries the transform (its layout width is
      // a whole number of px, so the ratio is exact; a text element's
      // offsetWidth is rounded).
      const drawnScale = (el: HTMLElement): number => {
        const carrier = (el.closest('.orb-slot, .orbit-sun, .stream-pearl') as HTMLElement | null) || el;
        const w = carrier.offsetWidth;
        return w > 0 ? carrier.getBoundingClientRect().width / w : tvScale;
      };

      const checkedElements = new Set<HTMLElement>();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!el || !(node.nodeValue || '').trim()) continue;
        if (el.closest('[data-welcome-measure], [data-orbit-measure]')) continue;
        if (effectiveOpacity(el) <= 0.1) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
        if (!rects.length) continue;
        const selector = describe(el);

        if (!checkedElements.has(el)) {
          checkedElements.add(el);
          // A shimmering title word carries decorative spark glyphs that
          // animate a few px past the line box; they are not text.
          const decorative = !!el.querySelector('.spark-word') || !!el.closest('.spark-word');
          if (!decorative && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
            failures.push({ selector, reason: 'scrollWidth exceeds clientWidth', detail: `${el.scrollWidth} > ${el.clientWidth}` });
          }
          if (!decorative && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1) {
            failures.push({ selector, reason: 'scrollHeight exceeds clientHeight', detail: `${el.scrollHeight} > ${el.clientHeight}` });
          }
          const cs = window.getComputedStyle(el);
          if (cs.textOverflow === 'ellipsis') failures.push({ selector, reason: 'text-overflow is ellipsis' });
          const clamp = cs.getPropertyValue('-webkit-line-clamp') || cs.getPropertyValue('line-clamp');
          if (clamp && clamp !== 'none') failures.push({ selector, reason: 'line-clamp applied', detail: clamp });
          if (el.matches('.message')) {
            const scale = drawnScale(el);
            const drawn = parseFloat(cs.fontSize) * scale;
            if (drawn < 18 * tvScale - 0.05) {
              failures.push({ selector, reason: 'message drawn below the 18 px floor', detail: `${drawn.toFixed(2)} px drawn (font ${cs.fontSize} at scale ${scale.toFixed(3)}), floor ${(18 * tvScale).toFixed(1)}` });
            }
          }
        }

        const bubble = closestOf(el, BUBBLE_SELECTORS);
        const circle = bubble ? circleOf(bubble) : null;
        const panel = circle ? null : closestOf(el, PANEL_SELECTORS);
        const stream = bubble && bubble.matches('.stream-pearl') ? bubble.closest<HTMLElement>('.stream-world') : null;
        for (const r of rects) {
          if (circle) {
            const margin = Math.max(rimMargin * circle.diameter, rimMarginMin * circle.scale);
            const limit = circle.diameter / 2 - margin;
            const far = farthestCorner(r, circle);
            if (far > limit + 0.75) {
              failures.push({ selector, reason: 'text past the bubble rim margin', detail: `corner ${far.toFixed(1)} > ${limit.toFixed(1)} (diameter ${circle.diameter.toFixed(1)}, margin ${margin.toFixed(1)})` });
              break;
            }
          } else if (panel && outside(r, panel.getBoundingClientRect())) {
            failures.push({ selector, reason: 'text outside panel box', detail: `${fmtRect(r)} panel ${fmtRect(panel.getBoundingClientRect())}` });
            break;
          }
          if (stream && outside(r, stream.getBoundingClientRect())) {
            failures.push({ selector, reason: 'pearl text outside the stream panel', detail: `${fmtRect(r)} panel ${fmtRect(stream.getBoundingClientRect())}` });
            break;
          }
          if (outside(r, sceneRect)) {
            failures.push({ selector, reason: 'text outside the scene box', detail: `${fmtRect(r)} scene ${fmtRect(sceneRect)}` });
            break;
          }
          if (r.left < -0.75 || r.top < -0.75 || r.right > window.innerWidth + 0.75 || r.bottom > window.innerHeight + 0.75) {
            failures.push({ selector, reason: 'text outside viewport', detail: `${fmtRect(r)} viewport ${window.innerWidth}x${window.innerHeight}` });
            break;
          }
        }
      }

      // Pages only for a message that cannot fit whole, in one bubble at a
      // time, and only when every page fits the dwell.
      const slotsState: Array<{ id: string; key: string; reading?: { pages: string[] } }> = state?.slots ?? [];
      root.querySelectorAll<HTMLElement>('.orb-page-indicator').forEach((indicator) => {
        if (indicator.hidden || effectiveOpacity(indicator) <= 0.1) return;
        const slot = indicator.closest<HTMLElement>('.orb-slot');
        if (!slot) return;
        const id = slot.dataset.recordId || '';
        const selector = `page indicator in ${id}`;
        if (singlePageIds.includes(id)) {
          failures.push({ selector, reason: 'paginated a message that must show whole', detail: indicator.textContent || '' });
        }
        // One paging bubble at a time: the largest position. A neighbour
        // that shows its whole message may be bigger; shrinking it would
        // page it, which is worse.
        const otherPaging = Array.from(root.querySelectorAll<HTMLElement>('.orb-page-indicator')).filter((other) => other !== indicator && !other.hidden && effectiveOpacity(other) > 0.1);
        if (otherPaging.length) {
          failures.push({ selector, reason: 'more than one bubble pages', detail: otherPaging.map((o) => o.closest<HTMLElement>('.orb-slot')?.dataset.recordId || '').join(', ') });
        }
        const reading = slotsState.find((s) => s.key === slot.id)?.reading;
        if (reading && reading.pages.length > 1) {
          const seconds = reading.pages.reduce((n, p) => n + Math.max(9, p.length / 14), 0);
          if (seconds > dwell + 0.01) {
            failures.push({ selector, reason: 'pages do not fit the dwell', detail: `${reading.pages.length} pages need ${seconds.toFixed(1)} s, dwell ${dwell} s` });
          }
        }
      });

      restore.forEach(([el, transform]) => {
        el.style.transform = transform;
      });
      restoreRotate.forEach(([el, rotate]) => {
        el.style.rotate = rotate;
      });

      const seen = new Set<string>();
      return failures.filter((f) => {
        const key = `${f.selector}|${f.reason}|${f.detail ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    {
      rootSelector: sceneRootSelector,
      singlePageIds: options.singlePageIds ?? [],
      rimMargin: options.rimMargin ?? 0.03,
      rimMarginMin: options.rimMarginMin ?? 12,
      dwellSeconds: options.dwellSeconds ?? null,
    },
  );
}

/**
 * Reads each bubble's layout diameter, drawn diameter, page count, message
 * font and drawn font inside `sceneRootSelector`, keyed by record id, for
 * reporting and for the page rule assertions.
 * Called by welcome.spec.ts and orbit.spec.ts.
 */
export async function bubbleReadings(frame: Frame, sceneRootSelector: string) {
  return await frame.evaluate((rootSelector) => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    const tv = document.getElementById('tv');
    const tvScale = tv ? tv.getBoundingClientRect().width / 1920 : 1;
    const out: Array<{ id: string; diameter: number; drawn: number; pages: number; font: number; drawnFont: number; visible: boolean }> = [];
    root?.querySelectorAll<HTMLElement>('.orb-slot').forEach((slot) => {
      if (slot.closest('[data-welcome-measure], [data-orbit-measure]')) return;
      const indicator = slot.querySelector<HTMLElement>('.orb-page-indicator');
      const text = indicator && !indicator.hidden ? indicator.textContent || '' : '';
      const match = text.match(/\/\s*(\d+)/);
      const msg = slot.querySelector<HTMLElement>('.message');
      // Rendered over layout width of the bubble: the TV scale times every
      // transform on it (depth layer, drift breathing, orbit projection).
      const scale = slot.offsetWidth ? slot.getBoundingClientRect().width / slot.offsetWidth : tvScale;
      let opacity = 1;
      for (let node: HTMLElement | null = slot; node && !node.matches('.scene'); node = node.parentElement) opacity *= parseFloat(window.getComputedStyle(node).opacity || '1');
      const font = msg ? parseFloat(getComputedStyle(msg).fontSize) : 0;
      out.push({
        id: slot.dataset.recordId || '',
        diameter: slot.offsetWidth,
        drawn: Math.round((slot.offsetWidth * scale) / tvScale),
        pages: match ? parseInt(match[1], 10) : 1,
        font,
        drawnFont: Math.round(font * scale * 100) / 100,
        visible: opacity > 0.1,
      });
    });
    return out;
  }, sceneRootSelector);
}

/**
 * The largest circle (layout px, in the 1812 by 636 stage) that fits the
 * Welcome bubble area without touching any other bubble as drawn now: the
 * area right of the title block and the speech bubbles (their measured
 * boxes plus core's 14 px steering margin), 8 px in from the stage's top and
 * bottom and 30 px in from its right edge (placeWelcome's clamps), avoiding
 * the drawn circle of every bubble except `excludeRecordId` and crossing no
 * other bubble's box by more than 20 px (the Plan 15 rule). Computed from
 * the DOM alone, never from anything welcome.js writes. A paging bubble must
 * be at least this large (less a small tolerance) at its home position.
 * Called by welcome.spec.ts.
 */
export async function welcomeLargestFreeCircle(frame: Frame, excludeRecordId: string): Promise<{ diameter: number; cx: number; cy: number }> {
  return await frame.evaluate((excludeId) => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="1"]');
    if (!scene) return { diameter: 0, cx: 0, cy: 0 };
    const sceneRect = scene.getBoundingClientRect();
    const s = sceneRect.width / 1812;
    const toLayout = (r: DOMRect) => ({ left: (r.left - sceneRect.left) / s, top: (r.top - sceneRect.top) / s, right: (r.right - sceneRect.left) / s, bottom: (r.bottom - sceneRect.top) / s });
    let keepRight = 0;
    scene.querySelectorAll<HTMLElement>('.scene-copy, .speech-bubble').forEach((el) => {
      const r = toLayout(el.getBoundingClientRect());
      keepRight = Math.max(keepRight, r.right);
    });
    const region = { left: keepRight + 14, top: 8, right: 1812 - 30, bottom: 636 - 8 };
    const circles: Array<{ cx: number; cy: number; r: number }> = [];
    scene.querySelectorAll<HTMLElement>('.orb-slot').forEach((slot) => {
      if (slot.closest('[data-welcome-measure]') || slot.dataset.recordId === excludeId) return;
      const t = window.getComputedStyle(slot).transform;
      const prev = slot.style.transform;
      if (t && t !== 'none' && !t.startsWith('matrix3d')) {
        const m = new DOMMatrixReadOnly(t);
        const k = Math.hypot(m.a, m.b);
        slot.style.transform = `matrix(${k},0,0,${k},${m.e},${m.f})`;
      }
      const r = toLayout(slot.getBoundingClientRect());
      slot.style.transform = prev;
      circles.push({ cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, r: (r.right - r.left) / 2 });
    });
    let best = { r: 0, cx: 0, cy: 0 };
    for (let cy = region.top + 20; cy <= region.bottom - 20; cy += 2) {
      for (let cx = region.left + 20; cx <= region.right - 20; cx += 2) {
        let r = Math.min(cx - region.left, region.right - cx, cy - region.top, region.bottom - cy);
        if (r <= best.r) continue;
        for (const c of circles) {
          // Clear of the other circle, and its box crossing the other's box
          // by no more than 20 px (the Plan 15 rule helpers.spec.ts keeps).
          r = Math.min(r, Math.hypot(cx - c.cx, cy - c.cy) - c.r, Math.max(Math.abs(cx - c.cx), Math.abs(cy - c.cy)) - c.r + 20);
          if (r <= best.r) break;
        }
        if (r > best.r) best = { r, cx, cy };
      }
    }
    return { diameter: best.r * 2, cx: best.cx, cy: best.cy };
  }, excludeRecordId);
}

/**
 * Whether the whole message of the record with `recordId` fits on one page
 * in a bubble of `layoutDiameter` layout px at `font` px, rendered with the
 * renderer's own bubble markup and the same inline sizing core applies, and
 * judged with this file's own geometry: every text line and chip inside the
 * circle max(3 percent of the diameter, 12 px) in from the rim. Used to
 * decide, independently of the scene code, whether a paging record really
 * could not have shown whole at the largest achievable size.
 * Called by welcome.spec.ts and orbit.spec.ts.
 */
export async function fitsWhole(frame: Frame, recordId: string, layoutDiameter: number, font: number): Promise<boolean> {
  return await frame.evaluate(
    ({ recordId, d, font }) => {
      const record = ((0, eval)('S.pool') as Array<any>).find((r) => r.id === recordId);
      if (!record) return false;
      const stage = document.getElementById('stage')!;
      const host = document.createElement('div');
      host.className = 'scene';
      host.dataset.scene = '1';
      host.dataset.welcomeMeasure = 'true';
      host.style.cssText = 'visibility:hidden;pointer-events:none;z-index:-1';
      stage.append(host);
      try {
        host.innerHTML = `<div class="orb-slot" style="left:0;top:0;width:${d}px;height:${d}px;--tint:#FFD05F"><div class="orb-life">${(0, eval)('completeOrb')(record, d)}</div></div>`;
        const el = host.firstElementChild as HTMLElement;
        const content = el.querySelector<HTMLElement>('.orb-content')!;
        const msg = el.querySelector<HTMLElement>('.message')!;
        const title = el.querySelector<HTMLElement>('.recipient');
        const chipBox = el.querySelector<HTMLElement>('.chips');
        const style = (width: number) => {
          if (title && record.name.length > 16) title.style.fontSize = (d >= 450 ? 30 : 23) + 'px';
          if (chipBox && record.ids.length > 3) {
            chipBox.style.gap = '3px';
            chipBox.querySelectorAll<HTMLElement>('.chip').forEach((x) => { x.style.fontSize = (d >= 450 ? 13 : 10) + 'px'; x.style.padding = '2px 4px'; });
          }
          if (d < 335) {
            if (title) title.style.fontSize = '26px';
            chipBox?.querySelectorAll<HTMLElement>('.chip').forEach((x) => { x.style.fontSize = '10.5px'; x.style.padding = '2px 3px'; const img = x.querySelector<HTMLElement>('img'); if (img) { img.style.width = '16px'; img.style.height = '16px'; } });
            if (chipBox) chipBox.style.marginTop = '6px';
          }
          msg.style.fontSize = font + 'px';
          msg.style.lineHeight = '1.27';
          content.style.width = width + '%';
          content.style.maxWidth = width + '%';
          msg.textContent = record.message;
        };
        const inside = () => {
          if (content.scrollWidth > content.clientWidth + 1) return false;
          const box = el.getBoundingClientRect();
          const k = box.width / d;
          const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
          const limit = (d / 2 - Math.max(0.03 * d, 12)) * k;
          const rects: DOMRect[] = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (!(n.nodeValue || '').trim() || (n.parentElement as HTMLElement).closest('[hidden]')) continue;
            const rg = document.createRange();
            rg.selectNodeContents(n);
            for (const q of Array.from(rg.getClientRects())) if (q.width > 0) rects.push(q);
          }
          el.querySelectorAll('.chip').forEach((c) => rects.push(c.getBoundingClientRect()));
          return rects.every((q) => Math.hypot(Math.max(Math.abs(q.left - cx), Math.abs(q.right - cx)), Math.max(Math.abs(q.top - cy), Math.abs(q.bottom - cy))) <= limit);
        };
        for (const width of [80, 74, 68]) {
          style(width);
          if (inside()) return true;
        }
        return false;
      } finally {
        host.remove();
      }
    },
    { recordId, d: Math.round(layoutDiameter), font },
  );
}
