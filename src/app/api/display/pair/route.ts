import { NextRequest, NextResponse } from "next/server";
import { databaseAction, randomSessionToken, sha256 } from "@/lib/server/operations";
import { databaseResult, errorResult, requireTrustedOrigin, requestRateKeys } from "@/lib/server/response";
import { readJson, requireConfigured } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const csrf = requireTrustedOrigin(request);
  if (csrf) return csrf;
  const body = await readJson(request);
  if (body.error) return body.error;
  const code = body.value && typeof body.value === "object" && typeof (body.value as Record<string, unknown>).code === "string" ? ((body.value as Record<string, unknown>).code as string).trim().toUpperCase() : "";
  if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(code)) return errorResult(400, "INVALID_REQUEST");
  const rawToken = randomSessionToken();
  const rates = requestRateKeys(request);
  const result = await databaseAction("display_pair", { code, tokenHash: sha256(rawToken), rateIp: rates.ip, rateContext: rates.context });
  if (result.error || !result.data || result.data.ok !== true) return databaseResult(result.data, result.error);
  const response = NextResponse.json({ paired: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  response.cookies.set("ml_display_session", rawToken, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
