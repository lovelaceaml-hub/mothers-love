import { NextRequest, NextResponse } from "next/server";
import { readJson, requireConfigured } from "@/lib/server/http";
import { databaseResult, errorResult, requireTrustedOrigin, requestRateKeys } from "@/lib/server/response";
import { getServerConfig } from "@/lib/server/env";
import {
  isReactionCookie,
  projectReactionMutation,
  REACTION_COOKIE_NAME,
  setReaction,
  visitorHash,
} from "@/lib/server/reactions";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string }> };

function withReactionVary(response: NextResponse): NextResponse {
  response.headers.set("Vary", "Origin, Cookie");
  return response;
}

function hasTrustedReactionOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") return false;
  const configuredAppUrl = getServerConfig()?.appUrl?.replace(/\/$/, "");
  if (configuredAppUrl) return origin === configuredAppUrl;
  if (requireTrustedOrigin(request) === null) return true;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(/:$/, "");
  return origin === `${protocol}://${host}`;
}

export async function PUT(request: NextRequest, context: Context) {
  const unavailable = requireConfigured();
  if (unavailable) return withReactionVary(unavailable);

  if (!hasTrustedReactionOrigin(request)) return withReactionVary(errorResult(403, "CSRF_ORIGIN"));

  const cookie = request.cookies.get(REACTION_COOKIE_NAME)?.value || null;
  if (!isReactionCookie(cookie)) {
    return withReactionVary(errorResult(428, "COOKIE_REQUIRED", "Please enable cookies and retry."));
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return withReactionVary(errorResult(400, "INVALID_REQUEST"));

  const body = await readJson(request);
  if (body.error) return withReactionVary(body.error);
  if (!body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
    return withReactionVary(errorResult(400, "INVALID_REQUEST"));
  }
  const payload = body.value as Record<string, unknown>;
  if (Object.keys(payload).length !== 1 || typeof payload.liked !== "boolean") {
    return withReactionVary(errorResult(400, "INVALID_REQUEST"));
  }

  const rates = requestRateKeys(request);
  const result = await setReaction(id, visitorHash(cookie), payload.liked, rates.ip);
  if (result.error) return withReactionVary(errorResult(503, "UNAVAILABLE"));
  const projected = projectReactionMutation(result.data);
  if (!projected) {
    const data = result.data;
    const code = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>).code : null;
    if (code === "NOT_FOUND") return withReactionVary(errorResult(404, "NOT_FOUND"));
    if (code === "THROTTLED") {
      const response = errorResult(429, "THROTTLED");
      response.headers.set("Retry-After", "60");
      return withReactionVary(response);
    }
    if (code === "UNAVAILABLE") return withReactionVary(errorResult(503, "UNAVAILABLE"));
    return withReactionVary(errorResult(503, "UNAVAILABLE"));
  }

  return withReactionVary(databaseResult(projected));
}
