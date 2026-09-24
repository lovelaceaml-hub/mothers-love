import { NextRequest } from "next/server";
import { validateRecognitionInput } from "@/lib/server/validation";
import { screenRecognition } from "@/lib/server/filter";
import { databaseAction } from "@/lib/server/operations";
import { errorResult, databaseResult, requireTrustedOrigin, requestRateKeys } from "@/lib/server/response";
import { readJson, requireConfigured } from "@/lib/server/http";
import { sha256 } from "@/lib/server/operations";
import { clampPublicExpiry } from "@/lib/server/expiry-clamp";

export async function POST(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const csrf = requireTrustedOrigin(request);
  if (csrf) return csrf;
  const body = await readJson(request);
  if (body.error) return body.error;
  const validation = validateRecognitionInput(body.value);
  if (validation.issues.length || !validation.value) return errorResult(400, "INVALID_REQUEST", "Please check the recognition fields.");
  const value = validation.value;
  const filter = screenRecognition(value.submittedName, value.recipient, value.message);
  const rates = requestRateKeys(request);
  const result = await databaseAction("submit", {
    ...value,
    payloadHash: sha256(JSON.stringify(value)),
    hold: filter.disposition === "hold",
    holdReason: filter.categories.includes("filter_error") ? "filter_error" : "safety",
    filterCategories: filter.categories,
    rateIp: rates.ip,
    rateContext: rates.context,
  });
  const data = result.data?.ok === true && typeof result.data.expiresAt === "string" && Number.isFinite(Date.parse(result.data.expiresAt))
    ? { ...result.data, expiresAt: clampPublicExpiry(result.data.expiresAt, Date.now()) }
    : result.data;
  return databaseResult(data, result.error, result.data?.ok === true ? 201 : 200);
}
