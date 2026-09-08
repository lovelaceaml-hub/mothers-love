import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { actorPayload, databaseAction } from "@/lib/server/operations";
import { errorResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { endOfLosAngelesMonth, endOfLosAngelesWeek, isoDateInLosAngeles, startOfLosAngelesMonth, startOfLosAngelesWeek } from "@/lib/server/time";
import { validateReportQuery } from "@/lib/server/validation";

function bounds(request: NextRequest) {
  const period = validateReportQuery(request.nextUrl.searchParams.get("period"), request.nextUrl.searchParams.get("from"), request.nextUrl.searchParams.get("to"));
  if (!period) return null;
  const now = new Date();
  if (period.period === "week") return { from: startOfLosAngelesWeek(now), to: endOfLosAngelesWeek(now) };
  if (period.period === "month") return { from: startOfLosAngelesMonth(now), to: endOfLosAngelesMonth(now) };
  if (period.period === "all") return { from: "1970-01-01", to: isoDateInLosAngeles(now) };
  return { from: period.from!, to: endOfLosAngelesMonth(new Date(`${period.to}T12:00:00Z`)) };
}

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const period = bounds(request);
  if (!period) return errorResult(400, "INVALID_REQUEST");
  const result = await databaseAction("admin_report", { actor: actorPayload(verified.actor), ...period });
  if (result.error || !result.data || result.data.ok !== true) return errorResult(Number(result.data?.status) || 503, String(result.data?.code || "DATABASE_ERROR"));
  const aggregate = result.data.aggregate as Record<string, unknown>;
  const expressionCounts = Array.isArray(aggregate.expressionCounts) ? aggregate.expressionCounts : [];
  const rows = [
    ["periodStart", aggregate.periodStart],
    ["periodEnd", aggregate.periodEnd],
    ["recognitions", aggregate.recognitions],
    ["expression1", expressionCounts[0] ?? 0],
    ["expression2", expressionCounts[1] ?? 0],
    ["expression3", expressionCounts[2] ?? 0],
    ["expression4", expressionCounts[3] ?? 0],
    ["expression5", expressionCounts[4] ?? 0],
    ["expression6", expressionCounts[5] ?? 0],
    ["expression7", expressionCounts[6] ?? 0],
    ["expression8", expressionCounts[7] ?? 0],
    ["expression9", expressionCounts[8] ?? 0],
    ["expressionTotal", aggregate.expressionTotal],
    ["revision", aggregate.revision],
  ];
  const csv = rows.map(([key, value]) => `${key},${JSON.stringify(value ?? "")}`).join("\n") + "\n";
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=mother-love-aggregate.csv", "Cache-Control": "no-store" } });
}

