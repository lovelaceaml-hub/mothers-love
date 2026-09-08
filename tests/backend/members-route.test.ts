import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyAdmin, databaseAction, readJson, authClient, signInWithOtp } = vi.hoisted(() => ({
  verifyAdmin: vi.fn(),
  databaseAction: vi.fn(),
  readJson: vi.fn(),
  authClient: vi.fn(),
  signInWithOtp: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({ verifyAdmin }));
vi.mock("@/lib/server/operations", () => ({
  actorPayload: (actor: unknown) => actor,
  databaseAction,
}));
vi.mock("@/lib/server/supabase", () => ({ authClient }));
vi.mock("@/lib/server/http", () => ({
  requireConfigured: () => null,
  readJson,
}));

import { POST } from "@/app/api/admin/members/route";

const actor = { userId: "00000000-0000-4000-8000-000000000001", email: "owner@example.test", role: "owner" as const, aal2: true };
const invite = { email: "mod@example.test", role: "moderator" };

function request() {
  return new NextRequest("https://mothers-love.example/api/admin/members", { method: "POST" });
}

beforeEach(() => {
  verifyAdmin.mockResolvedValue({ actor });
  databaseAction.mockReset();
  readJson.mockResolvedValue({ value: invite });
  authClient.mockReturnValue({ auth: { signInWithOtp } });
  signInWithOtp.mockReset();
});

describe("admin member invitation delivery", () => {
  it("retries delivery for an existing pending invitation without renewing or inventing its expiry", async () => {
    databaseAction
      .mockResolvedValueOnce({ data: { ok: true, expiresAt: "2026-09-14T00:00:00Z" }, error: null })
      .mockResolvedValueOnce({ data: { ok: false, status: 409, code: "INVITATION_EXISTS" }, error: null });
    signInWithOtp.mockResolvedValueOnce({ error: new Error("provider unavailable") }).mockResolvedValueOnce({ error: null });

    const firstResponse = await POST(request());
    expect(firstResponse.status).toBe(503);
    expect(await firstResponse.json()).toMatchObject({ code: "INVITATION_UNAVAILABLE" });

    const retryResponse = await POST(request());
    expect(retryResponse.status).toBe(201);
    const retryBody = await retryResponse.json();
    expect(retryBody).toEqual({ invited: true });
    expect(retryBody).not.toHaveProperty("expiresAt");
    expect(signInWithOtp).toHaveBeenCalledTimes(2);
    expect(signInWithOtp).toHaveBeenNthCalledWith(2, {
      email: invite.email,
      options: { shouldCreateUser: true, emailRedirectTo: "https://mothers-love.vercel.app/admin/set-password" },
    });
  });

  it("does not send mail for an unrelated database conflict", async () => {
    databaseAction.mockResolvedValue({ data: { ok: false, status: 409, code: "OTHER_CONFLICT" }, error: null });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "OTHER_CONFLICT" });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("does not send mail when the database transport fails", async () => {
    databaseAction.mockResolvedValue({ data: null, error: new Error("DATABASE_ERROR") });

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "DATABASE_ERROR" });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("does not send mail when the caller is denied", async () => {
    verifyAdmin.mockResolvedValue({ actor: null, result: { status: 403, code: "OWNER_REQUIRED" } });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "OWNER_REQUIRED" });
    expect(databaseAction).not.toHaveBeenCalled();
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
});
