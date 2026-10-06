// Which build of the site this page was loaded from. A TV page stays open for
// weeks, so it compares this with the build the server now runs and reloads
// itself when a new version is live (see DisplayBuildWatch).
//
// Set at build time from Vercel's commit (next.config.ts). Empty on a local
// build, which turns the check off.
export const DISPLAY_BUILD = process.env.DISPLAY_BUILD_VERSION ?? '';

export type BuildCheck = {
  ours: string;
  reported: string | null;     // what the server reports now; null when the check failed
  previous: string | null;     // what it reported on the check before
  alreadyReloadedFor: string | null; // the build this tab last reloaded for
};

// Reload only when the server reports the same new build twice in a row (so a
// deploy that is still rolling out never bounces the TV), and only once per
// build (so a stale cached page can never put the TV in a reload loop).
export function shouldReload({ ours, reported, previous, alreadyReloadedFor }: BuildCheck): boolean {
  if (!ours || !reported) return false;
  if (reported === ours) return false;
  if (reported !== previous) return false;
  return reported !== alreadyReloadedFor;
}
