export interface Expression {
  id: number;
  phrase: string;
  principle: string;
  color: string;
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

export interface DisplaySettings {
  version: number;
  mode: DisplayMode;
  motion: DisplayMotion;
  pauseArrivals: boolean;
  pauseRotation: boolean;
  collectionOpen: boolean;
  lowActivityMinutes: number;
  readingSeconds: number;
  maxBubbles: number;
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
