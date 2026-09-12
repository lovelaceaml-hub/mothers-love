export interface Expression {
  id: number;
  phrase: string;
  principle: string;
  color: string;
  example?: string;
}

export interface RecognitionInput {
  submittedName: string;
  recipient: string;
  message: string;
  expressionIds: number[];
  requestKey: string;
}

export interface EditableRecognitionFields {
  submittedName: string;
  recipient: string;
  message: string;
  expressionIds: number[];
}

export type RecognitionStatus = "held" | "published" | "hidden" | "invalid";

export interface Recognition {
  id: string;
  recipient: string;
  message: string;
  expressionIds: number[];
  createdAt: string;
  firstPublishedAt: string | null;
  expiresAt: string;
  version: number;
  status: RecognitionStatus;
  featured: boolean;
}

export interface AdminRecognition extends Recognition {
  submittedName: string;
  reason: string | null;
}

export interface Aggregate {
  periodStart: string;
  periodEnd: string;
  recognitions: number;
  expressionCounts: number[];
  expressionTotal: number;
  revision: number;
}

export type DisplayMode = "normal" | "quiet" | "neutral";
export type DisplayMotion = "calm" | "standard" | "lively" | "still";

export const DISPLAY_SCREEN_IDS = [
  "garden",
  "featured",
  "impact",
  "expressions",
  "shared-expression",
  "spotlight",
  "daily-practice",
  "one-kind-word",
  "everyday-peace",
  "peace-promise",
] as const;

export type DisplayScreenId = (typeof DISPLAY_SCREEN_IDS)[number];

export type DisplayGardenAmount = "all-active" | number;

// Tempo is intentionally an allowlist rather than an arbitrary multiplier.
// The calm and lively aliases keep older settings clients readable while the
// standard three values are used by the new display studio.
export type DisplayTempo = "slow" | "standard" | "fast" | "calm" | "gentle" | "lively";

export type DisplayPlaylistEntry = {
  id: DisplayScreenId;
  enabled: boolean;
  durationSeconds?: number;
};

export type DisplayEffects = {
  trails: boolean;
  constellations: boolean;
  sparkles?: boolean;
  background?: boolean;
};

export type DisplaySound = {
  enabled: boolean;
  volume: number;
  arrivalChime: boolean;
  milestoneChime: boolean;
};

export const DISPLAY_EXTERNAL_URLS = {
  dailyPractice: "https://heavenlymotherslove.org/en/checklist",
  peacePromise: "https://heavenlymotherslove.org/en/signature",
} as const;

// This alias gives callers a name that emphasizes the trust boundary.
export const TRUSTED_DISPLAY_URLS = DISPLAY_EXTERNAL_URLS;

export const DEFAULT_DISPLAY_GARDEN_AMOUNT: DisplayGardenAmount = "all-active";
export const DEFAULT_DISPLAY_TEMPO: DisplayTempo = "standard";
export const DEFAULT_DISPLAY_PLAYLIST: readonly DisplayPlaylistEntry[] = DISPLAY_SCREEN_IDS.map((id) => ({ id, enabled: true }));
export const DEFAULT_DISPLAY_EFFECTS: DisplayEffects = {
  trails: true,
  constellations: true,
  sparkles: true,
  background: true,
};
export const DEFAULT_DISPLAY_SOUND: DisplaySound = {
  enabled: true,
  volume: 0.2,
  arrivalChime: true,
  milestoneChime: true,
};

export interface DisplaySettings {
  version: number;
  mode: DisplayMode;
  motion: DisplayMotion;
  pauseArrivals: boolean;
  pauseRotation: boolean;
  collectionOpen: boolean;
  lowActivityMinutes: number;
  readingSeconds: number;
  /** @deprecated Use gardenAmount. Kept while old display clients roll forward. */
  maxBubbles: number;
  gardenAmount?: DisplayGardenAmount;
  playlist?: DisplayPlaylistEntry[];
  tempo?: DisplayTempo;
  durationOverrides?: Partial<Record<DisplayScreenId, number>>;
  effects?: DisplayEffects;
  sound?: DisplaySound;
  externalUrls?: typeof DISPLAY_EXTERNAL_URLS;
  showTrails: boolean;
  showConstellations: boolean;
}

export interface DisplaySnapshot {
  serverTime: string;
  revision: number;
  recognitions: Recognition[];
  aggregate: Aggregate;
  settings: DisplaySettings;
  submissionUrl: string;
  cursor: string;
  sync: "reset" | "delta";
  arrivals: Array<{
    eventId: string;
    recognitionId: string;
    publishedAt: string;
  }>;
}

export type AdminRole = "owner" | "moderator";

export interface AdminSession {
  id: string;
  role: AdminRole;
  needsMfa: boolean;
}

export type AdminAssuranceLevel = "aal1" | "aal2";

export interface ApiError {
  error: string;
  code: string;
}

export interface Device {
  id: string;
  label: string;
  lastSeenAt: string | null;
  appliedVersion: number;
  appliedSnapshotRevision: number;
  revoked: boolean;
}

export interface ApiClientOptions extends RequestInit {
  auth?: boolean;
  token?: string | null;
  bearerToken?: string | null;
}

/**
 * Maximum graphemes a member may submit in one recognition message.
 *
 * Anthony's instruction, September 11 2026: set the limit to the longest
 * recognition actually sent that day. Measured against the live pool at
 * 2026-09-12T05:26Z: seven recognitions were created that day at 249, 185,
 * 173, 169, 123, 88 and 58 code points, and nothing in the whole seven-day
 * pool exceeded 249. The longest one contains an emoji, so it is 249 code
 * points but 248 graphemes, and this 249-grapheme cap keeps it valid.
 *
 * This governs what may be SUBMITTED or EDITED. It deliberately does not
 * govern what the display and the public feed accept when READING a record:
 * those guards stay at 500, because lowering them would make any already
 * published message longer than this cap vanish from the TV and the feed
 * rather than simply being long. Nothing in the pool is over 249 today, but
 * that is luck, not a guarantee, and silently dropping a real recognition is
 * far worse than showing a long one.
 */
export const MAX_MESSAGE_GRAPHEMES = 249;

/**
 * Upper bound used when validating a record that already exists. Kept at the
 * historical 500 so no published recognition is ever rejected on read. See
 * MAX_MESSAGE_GRAPHEMES above for why the two numbers differ.
 */
export const MAX_STORED_MESSAGE_GRAPHEMES = 500;
