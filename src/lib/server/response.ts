import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResult } from "./types";
import { getServerConfig } from "./env";

export function jsonResult(result: ApiResult, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(result, init);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Vary", "Origin");
  return response;
}

export function errorResult(status: number, code: string, error = code): NextResponse {
  return jsonResult({ ok: false, error, code }, { status });
}

export function databaseResult(data: unknown, error?: Error | null, successStatus = 200): NextResponse {
  if (error) return errorResult(503, error.message === "UNAVAILABLE" ? "UNAVAILABLE" : "DATABASE_ERROR");
  if (!data || typeof data !== "object") return errorResult(503, "DATABASE_ERROR");
  const result = data as ApiResult;
  if (result.ok === false) return errorResult(Number(result.status) || 400, String(result.code || "REQUEST_FAILED"), String(result.error || result.code || "REQUEST_FAILED"));
  const { ok: _ok, ...body } = result;
  return jsonResult(body, { status: successStatus });
}

export function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = getServerConfig()?.appUrl;
  if (configured && origin === configured.replace(/\/$/, "")) return true;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return false;
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return origin === `${protocol}://${host}`;
}

export function requireTrustedOrigin(request: NextRequest): NextResponse | null {
  return isTrustedOrigin(request) ? null : errorResult(403, "CSRF_ORIGIN");
}

export function requestRateKeys(request: NextRequest): { ip: string; context: string | null } {
  // Same rule as the TV admission guard: the final forwarded address, which a client
  // cannot prepend to. On Vercel the platform header is preferred.
  const forwarded = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for"))
    ?.split(",").at(-1)?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const context = request.headers.get("x-ml-request-context")?.trim() || null;
  return { ip: ip.slice(0, 128), context: context?.slice(0, 128) || null };
}
