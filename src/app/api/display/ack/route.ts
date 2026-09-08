import { NextRequest } from "next/server";
import { databaseAction, sha256 } from "@/lib/server/operations";
import { databaseResult, errorResult, requireTrustedOrigin } from "@/lib/server/response";
import { readJson, requireConfigured } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const csrf = requireTrustedOrigin(request);
  if (csrf) return csrf;
  const body = await readJson(request);
  if (body.error) return body.error;
  if (!body.value || typeof body.value !== "object") return errorResult(400, "INVALID_REQUEST");
  const value = body.value as Record<string, unknown>;
  if (!Number.isInteger(value.settingsVersion) || !Number.isInteger(value.snapshotRevision)) return errorResult(400, "INVALID_REQUEST");
  const token = request.cookies.get("ml_display_session")?.value || null;
  const result = await databaseAction("display_ack", { tokenHash: token ? sha256(token) : null, settingsVersion: value.settingsVersion, snapshotRevision: value.snapshotRevision });
  const response = databaseResult(result.data, result.error);
  if (result.data?.code === "UNAUTHENTICATED" || result.error) response.cookies.set("ml_display_session", "", { httpOnly: true, secure: true, sameSite: "strict", maxAge: 0, path: "/" });
  return response;
}

