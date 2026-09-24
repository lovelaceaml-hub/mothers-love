// Forever-retained recognitions need a public ceiling to avoid browser timer
// overflow. Quantising it daily keeps TV records stable between polls.
export const PUBLIC_EXPIRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
const DAY_MS = 86_400_000;
const OFFSET_MS = 8 * 60 * 60 * 1_000;

export function publicExpiryCeilingMs(serverTimeMs: number): number {
  const dayStart = Math.floor((serverTimeMs - OFFSET_MS) / DAY_MS) * DAY_MS + OFFSET_MS;
  return dayStart + PUBLIC_EXPIRY_WINDOW_MS;
}

export function clampPublicExpiry(expiresAt: string, serverTimeMs: number): string {
  const ceiling = publicExpiryCeilingMs(serverTimeMs);
  return Date.parse(expiresAt) <= ceiling ? expiresAt : new Date(ceiling).toISOString();
}
