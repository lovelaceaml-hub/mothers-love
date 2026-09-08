import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { databaseClient, requireConfigured, randomSessionToken } = vi.hoisted(() => ({
  databaseClient: vi.fn(),
  requireConfigured: vi.fn(() => null),
  randomSessionToken: vi.fn(() => "A".repeat(43)),
}));

vi.mock("@/lib/server/supabase", () => ({ databaseClient }));
vi.mock("@/lib/server/operations", () => ({
  randomSessionToken,
  sha256: (value: string) => `hash-${value}`,
}));
vi.mock("@/lib/server/http", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/http")>("@/lib/server/http");
  return { ...actual, requireConfigured };
});

import { GET } from "@/app/api/reactions/route";
import { PUT } from "@/app/api/reactions/[id]/route";

const id = "00000000-0000-4000-8000-000000000010";
const idTwo = "00000000-0000-4000-8000-000000000011";
const cookie = "B".repeat(43);

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`https://mothers-love.example${path}`, init);
}

function sqlResult(result: unknown) {
  const sql = vi.fn().mockResolvedValue([{ result }]);
  (sql as typeof sql & { json: (value: unknown) => unknown }).json = (value: unknown) => value;
  databaseClient.mockReturnValue(sql);
  return sql;
}

beforeEach(() => {
  databaseClient.mockReset();
  requireConfigured.mockReturnValue(null);
  randomSessionToken.mockReturnValue("A".repeat(43));
});

describe("GET /api/reactions", () => {
  it("returns only eligible reaction DTOs and bootstraps a hardened cookie", async () => {
    const sql = sqlResult({ ok: true, items: [{ id, count: 2, liked: true }] });
    const response = await GET(request(`/api/reactions?ids=${id},${idTwo}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [{ id, count: 2, liked: true }] });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("ml_reaction=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("secure");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie).toContain("Path=/api/reactions");
    expect(setCookie).toContain("Max-Age=2592000");
    expect(setCookie).not.toContain("hash-");
    expect(sql).toHaveBeenCalledTimes(1);
    expect(String(sql.mock.calls[0]?.[0])).toContain("ml_reactions_get");
  });

  it("replaces malformed cookies and rejects duplicate or malformed ids before the database", async () => {
    sqlResult({ ok: true, items: [] });
    const replacement = await GET(request(`/api/reactions?ids=${id}`, { headers: { cookie: "ml_reaction=bad" } }));
    expect(replacement.status).toBe(200);
    expect(replacement.headers.get("set-cookie")).toContain("ml_reaction=");

    databaseClient.mockReset();
    const duplicate = await GET(request(`/api/reactions?ids=${id},${id}`));
    expect(duplicate.status).toBe(400);
    expect(databaseClient).not.toHaveBeenCalled();
    const scalar = await GET(request("/api/reactions?ids=not-a-uuid"));
    expect(scalar.status).toBe(400);
    expect(databaseClient).not.toHaveBeenCalled();
  });

  it("fails closed for unavailable or malformed database results", async () => {
    sqlResult({ ok: false, status: 503, code: "UNAVAILABLE" });
    const unavailable = await GET(request(`/api/reactions?ids=${id}`));
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ ok: false, error: "UNAVAILABLE", code: "UNAVAILABLE" });

    sqlResult({ ok: true, items: [{ id, count: -1, liked: false }] });
    const malformed = await GET(request(`/api/reactions?ids=${id}`, { headers: { cookie: `ml_reaction=${cookie}` } }));
    expect(malformed.status).toBe(503);

    sqlResult({ ok: true, items: [{ id: idTwo, count: 1, liked: false }] });
    const wrongId = await GET(request(`/api/reactions?ids=${id}`, { headers: { cookie: `ml_reaction=${cookie}` } }));
    expect(wrongId.status).toBe(503);
  });
});

describe("PUT /api/reactions/[id]", () => {
  const putRequest = (body: unknown, headers: Record<string, string> = {}) => request(`/api/reactions/${id}`, {
    method: "PUT",
    headers: {
      origin: "https://mothers-love.example",
      cookie: `ml_reaction=${cookie}`,
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  it("uses explicit desired-state semantics and returns a projected DTO", async () => {
    const sql = sqlResult({ ok: true, id, count: 1, liked: true });
    const response = await PUT(putRequest({ liked: true }), { params: Promise.resolve({ id }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id, count: 1, liked: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(String(sql.mock.calls[0]?.[0])).toContain("ml_reactions_set");
  });

  it("requires trusted origin, a valid existing cookie, and an exact boolean body", async () => {
    const noOrigin = await PUT(putRequest({ liked: true }, { origin: "" }), { params: Promise.resolve({ id }) });
    expect(noOrigin.status).toBe(403);

    const noCookie = await PUT(putRequest({ liked: true }, { cookie: "" }), { params: Promise.resolve({ id }) });
    expect(noCookie.status).toBe(428);

    const crossSite = await PUT(putRequest({ liked: true }, { "sec-fetch-site": "cross-site" }), { params: Promise.resolve({ id }) });
    expect(crossSite.status).toBe(403);

    const extraField = await PUT(putRequest({ liked: true, extra: false }), { params: Promise.resolve({ id }) });
    expect(extraField.status).toBe(400);
    expect(databaseClient).not.toHaveBeenCalled();
  });

  it("maps missing targets, neutral or unhealthy results, and throttles with Retry-After", async () => {
    sqlResult({ ok: false, status: 404, code: "NOT_FOUND" });
    const missing = await PUT(putRequest({ liked: false }), { params: Promise.resolve({ id }) });
    expect(missing.status).toBe(404);

    sqlResult({ ok: false, status: 503, code: "UNAVAILABLE" });
    const unavailable = await PUT(putRequest({ liked: true }), { params: Promise.resolve({ id }) });
    expect(unavailable.status).toBe(503);

    sqlResult({ ok: false, status: 429, code: "THROTTLED" });
    const throttled = await PUT(putRequest({ liked: true }), { params: Promise.resolve({ id }) });
    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("retry-after")).toBe("60");

    sqlResult({ ok: true, id: idTwo, count: 1, liked: true });
    const wrongId = await PUT(putRequest({ liked: true }), { params: Promise.resolve({ id }) });
    expect(wrongId.status).toBe(503);
  });
});
