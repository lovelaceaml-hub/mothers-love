import { NextRequest, NextResponse } from "next/server";
import { requireConfigured } from "@/lib/server/http";
import { databaseResult, errorResult } from "@/lib/server/response";
import {
  createReactionCookie,
  isReactionCookie,
  parseReactionIds,
  projectReactionResult,
  queryReactions,
  REACTION_COOKIE_MAX_AGE,
  REACTION_COOKIE_NAME,
  visitorHash,
} from "@/lib/server/reactions";

function withReactionVary(response: NextResponse): NextResponse {
  response.headers.set("Vary", "Origin, Cookie");
  return response;
}

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return withReactionVary(unavailable);

  const ids = parseReactionIds(request.nextUrl.searchParams.get("ids"));
  if (!ids) return withReactionVary(errorResult(400, "INVALID_REQUEST"));

  const existingCookie = request.cookies.get(REACTION_COOKIE_NAME)?.value || null;
  const reactionCookie = isReactionCookie(existingCookie) ? existingCookie : createReactionCookie();
  const result = await queryReactions(ids, visitorHash(reactionCookie));
  if (result.error) return withReactionVary(errorResult(503, "UNAVAILABLE"));
  const projected = projectReactionResult(result.data);
  if (!projected) return withReactionVary(errorResult(503, "UNAVAILABLE"));

  const response = withReactionVary(databaseResult(projected));
  if (!isReactionCookie(existingCookie)) {
    response.cookies.set({
      name: REACTION_COOKIE_NAME,
      value: reactionCookie,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: REACTION_COOKIE_MAX_AGE,
    });
  }
  return response;
}
