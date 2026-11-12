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

/** One admin action still on record for a recognition (the audit table keeps 30 days). */
export interface AdminAuditEntry {
  action: string;
  reason: string | null;
  outcome: string;
  at: string;
  version: number | null;
  /** The acting administrator's current role, never an identifier; null once they are removed. */
  actorRole: "owner" | "moderator" | null;
}

export interface AdminRecognition extends Recognition {
  submittedName: string;
  reason: string | null;
  // The three fields below arrive once database migration 021 is applied.
  updatedAt?: string;
  heartCount?: number;
  audit?: AdminAuditEntry[];
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
  onResponseHeaders?: (headers: Headers) => void;
}
