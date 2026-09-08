import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authClient, callDatabase, getUser, getClaims } = vi.hoisted(() => ({
  authClient: vi.fn(),
  callDatabase: vi.fn(),
  getUser: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@/lib/server/supabase", () => ({ authClient, callDatabase }));

import { verifyAdmin } from "@/lib/server/auth";
import { GET as sessionGet } from "@/app/api/admin/session/route";

const user = { id: "00000000-0000-4000-8000-000000000701", email: "owner-auth@example.test", email_confirmed_at: "2026-09-08T00:00:00Z" };

function request() {
  return new NextRequest("https://mothers-love.example/api/admin/session", { headers: { authorization: "Bearer valid-token" } });
}

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user }, error: null });
  getClaims.mockResolvedValue({ data: { claims: { sub: user.id, aal: "aal1" } }, error: null });
  authClient.mockReturnValue({ auth: { getUser, getClaims } });
  callDatabase.mockResolvedValue({ data: { ok: true, role: "owner" }, error: null });
});

describe("verified password-only admin access", () => {
  it("allows an AAL1 owner through legacy requireAal2 call sites", async () => {
    const result = await verifyAdmin(request(), true);

    expect(result).toEqual({ actor: { userId: user.id, email: user.email, role: "owner", aal2: false } });
    expect(callDatabase).toHaveBeenCalledWith("admin_session", { actor: { userId: user.id, email: user.email, aal2: false } });
  });

  it("reports needsMfa false for an authenticated AAL1 owner", async () => {
    const response = await sessionGet(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: user.id, role: "owner", needsMfa: false });
  });

  it("keeps an active moderator on the verified membership path", async () => {
    callDatabase.mockResolvedValue({ data: { ok: true, role: "moderator" }, error: null });

    const result = await verifyAdmin(request(), true);

    expect(result.actor).toEqual({ userId: user.id, email: user.email, role: "moderator", aal2: false });
  });

  it("denies an unverified email before membership lookup", async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });

    const result = await verifyAdmin(request());

    expect(result).toEqual({ actor: null, result: { status: 403, code: "EMAIL_UNVERIFIED" } });
    expect(getClaims).not.toHaveBeenCalled();
    expect(callDatabase).not.toHaveBeenCalled();
  });

  it("denies an invalid token before membership lookup", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid token") });

    const result = await verifyAdmin(request());

    expect(result).toEqual({ actor: null, result: { status: 401, code: "UNAUTHENTICATED" } });
    expect(callDatabase).not.toHaveBeenCalled();
  });

  it.each(["nonmember", "revoked membership"])("denies a %s from fresh membership authorization", async () => {
    callDatabase.mockResolvedValue({ data: { ok: false, status: 403, code: "FORBIDDEN" }, error: null });

    const result = await verifyAdmin(request());

    expect(result).toEqual({ actor: null, result: { status: 403, code: "FORBIDDEN" } });
  });
});
