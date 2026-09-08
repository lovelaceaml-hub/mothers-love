import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { actorPayload, databaseAction } from "@/lib/server/operations";
import { databaseResult, errorResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { endOfLosAngelesMonth, endOfLosAngelesWeek, isoDateInLosAngeles, startOfLosAngelesMonth, startOfLosAngelesWeek } from "@/lib/server/time";
import { validateReportQuery } from "@/lib/server/validation";

function reportBounds(request: NextRequest): { period: "week" | "month" | "all" | "custom"; from: string; to: string } | null {
  const period = validateReportQuery(request.nextUrl.searchParams.get("period"), request.nextUrl.searchParams.get("from"), request.nextUrl.searchParams.get("to"));
  if (!period) return null;
  const now = new Date();
  if (period.period === "week") return { period: period.period, from: startOfLosAngelesWeek(now), to: endOfLosAngelesWeek(now) };
  if (period.period === "month") return { period: period.period, from: startOfLosAngelesMonth(now), to: endOfLosAngelesMonth(now) };
  if (period.period === "all") return { period: period.period, from: "1970-01-01", to: isoDateInLosAngeles(now) };
  const end = endOfLosAngelesMonth(new Date(`${period.to}T12:00:00Z`));
  return { period: period.period, from: period.from!, to: end };
}

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const bounds = reportBounds(request);
  if (!bounds) return errorResult(400, "INVALID_REQUEST");
  const result = await databaseAction("admin_report", { actor: actorPayload(verified.actor), ...bounds });
  if (result.error || !result.data || result.data.ok !== true || !result.data.aggregate || typeof result.data.aggregate !== "object") return databaseResult(result.data, result.error);
  return databaseResult({ ok: true, ...(result.data.aggregate as Record<string, unknown>) });
}
