import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/server/env";
import { databaseAction } from "@/lib/server/operations";
import { jsonResult } from "@/lib/server/response";

export async function GET() {
  if (!isConfigured()) return jsonResult({ ok: true, configured: false, collectionOpen: false });
  const result = await databaseAction("config", {});
  if (result.error || !result.data || result.data.ok !== true) return jsonResult({ ok: true, configured: false, collectionOpen: false });
  return NextResponse.json({ configured: true, collectionOpen: result.data.collectionOpen === true }, { headers: { "Cache-Control": "no-store" } });
}

