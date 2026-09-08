export type RecognitionStatus = "held" | "published" | "hidden" | "invalid";

export type RecognitionInput = {
  submittedName: string;
  recipient: string;
  message: string;
  expressionIds: number[];
  requestKey: string;
};

export type Recognition = {
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
};

export type AdminRecognition = Recognition & {
  submittedName: string;
  reason: string | null;
};

export type EditableRecognitionFields = {
  submittedName: string;
  recipient: string;
  message: string;
  expressionIds: number[];
};

export type Aggregate = {
  periodStart: string;
  periodEnd: string;
  recognitions: number;
  expressionCounts: number[];
  expressionTotal: number;
  revision: number;
};

export type DisplaySettings = {
  version: number;
  mode: "normal" | "quiet" | "neutral";
  motion: "calm" | "standard" | "lively" | "still";
  pauseArrivals: boolean;
  pauseRotation: boolean;
  collectionOpen: boolean;
  lowActivityMinutes: number;
  readingSeconds: number;
  maxBubbles: number;
  showTrails: boolean;
  showConstellations: boolean;
};

export type Device = {
  id: string;
  label: string;
  lastSeenAt: string | null;
  appliedVersion: number;
  appliedSnapshotRevision: number;
  revoked: boolean;
};

export type DisplaySnapshot = {
  serverTime: string;
  revision: number;
  recognitions: Recognition[];
  aggregate: Aggregate;
  settings: DisplaySettings;
  submissionUrl: string;
  cursor: string;
  sync: "reset" | "delta";
  arrivals: Array<{ eventId: string; recognitionId: string; publishedAt: string }>;
};

export type ApiResult = {
  ok?: boolean;
  status?: number;
  code?: string;
  error?: string;
  [key: string]: unknown;
};

export type VerifiedActor = {
  userId: string;
  email: string | null;
  role: "owner" | "moderator";
  aal2: boolean;
};

export type MutationAction =
  | "edit"
  | "publish"
  | "hide"
  | "restore"
  | "invalidate"
  | "feature"
  | "unfeature"
  | "delete";
