import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyAdmin, databaseAction, readJson } = vi.hoisted(() => ({ verifyAdmin: vi.fn(), databaseAction: vi.fn(), readJson: vi.fn() }));

vi.mock("@/lib/server/auth", () => ({ verifyAdmin }));
vi.mock("@/lib/server/operations", () => ({
  actorPayload: (actor: unknown) => actor,
  databaseAction,
  randomPairCode: (length = 10) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".slice(0, length),
  randomSessionToken: () => "session-token",
  sha256: (value: string) => `hash:${value}`,
}));
vi.mock("@/lib/server/http", () => ({
  requireConfigured: () => null,
  readJson,
}));
vi.mock("@/lib/server/response", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/response")>("@/lib/server/response");
  return { ...actual, requireTrustedOrigin: () => null };
});

import * as adminRecognitionRoute from "@/app/api/admin/recognitions/[id]/route";
import * as publicRecognitionRoute from "@/app/api/recognitions/route";
import * as reportsRoute from "@/app/api/admin/reports/route";
import * as settingsRoute from "@/app/api/admin/settings/route";
import * as devicesRoute from "@/app/api/admin/devices/route";
import * as pairRoute from "@/app/api/display/pair/route";

const actor = { userId: "00000000-0000-4000-8000-000000000001", email: "owner@example.test", role: "owner" as const, aal2: true };
const settings = {
  version: 3,
  mode: "normal",
  motion: "calm",
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: true,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 4,
  showTrails: true,
  showConstellations: true,
};
const aggregate = { periodStart: "2026-09-01", periodEnd: "2026-09-30", recognitions: 2, expressionCounts: [1, 0, 1, 0, 0, 0, 0, 0, 0], expressionTotal: 2, revision: 4 };
const recognition = { id: "00000000-0000-4000-8000-000000000010", recipient: "Friend M.", message: "Thank you.", expressionIds: [2], createdAt: "2026-09-07T00:00:00Z", firstPublishedAt: "2026-09-07T00:00:00Z", expiresAt: "2026-09-14T00:00:00Z", version: 1, status: "published", featured: false, submittedName: "Sender A.", reason: null };

function request(path: string, init?: { method?: string; headers?: HeadersInit; body?: BodyInit | null }) {
  return new NextRequest(`https://mothers-love.example${path}`, init);
}

beforeEach(() => {
  verifyAdmin.mockResolvedValue({ actor });
  databaseAction.mockReset();
  readJson.mockReset();
});

describe("admin route DTOs", () => {
  it("returns a bare AdminRecognition for detail GET", async () => {
    databaseAction.mockResolvedValue({ data: { ok: true, recognition }, error: null });
    const response = await adminRecognitionRoute.GET(request("/api/admin/recognitions/00000000-0000-4000-8000-000000000010"), { params: Promise.resolve({ id: recognition.id }) });
    expect(await response.json()).toEqual(recognition);
  });

  it("accepts full public names and passes trimmed values to the database", async () => {
    readJson.mockResolvedValue({ value: { submittedName: " Sender Fullname ", recipient: " Friend M. ", message: "Thank you.", expressionIds: [2], requestKey: "request-1234" } });
    databaseAction.mockResolvedValue({ data: { ok: true, id: recognition.id }, error: null });
    const response = await publicRecognitionRoute.POST(request("/api/recognitions", { method: "POST", headers: { origin: "https://mothers-love.example" } }));
    expect(response.status).toBe(201);
    expect(databaseAction).toHaveBeenCalledWith("submit", expect.objectContaining({ submittedName: "Sender Fullname", recipient: "Friend M." }));
  });

  it("accepts full admin edit names before the database call", async () => {
    readJson.mockResolvedValue({ value: { expectedVersion: 1, action: "edit", fields: { submittedName: " Sender Fullname " }, reason: "correction" } });
    databaseAction.mockResolvedValue({ data: { ok: true, recognition }, error: null });
    const response = await adminRecognitionRoute.PATCH(request(`/api/admin/recognitions/${recognition.id}`, { method: "PATCH", headers: { origin: "https://mothers-love.example" } }), { params: Promise.resolve({ id: recognition.id }) });
    expect(response.status).toBe(200);
    expect(databaseAction).toHaveBeenCalledWith("admin_mutate", expect.objectContaining({ mutation: "edit", fields: { submittedName: "Sender Fullname" } }));
  });

  it("accepts single admin edit recipients before the database call", async () => {
    readJson.mockResolvedValue({ value: { expectedVersion: 1, action: "edit", fields: { recipient: "Cher" }, reason: "correction" } });
    databaseAction.mockResolvedValue({ data: { ok: true, recognition }, error: null });
    const response = await adminRecognitionRoute.PATCH(request(`/api/admin/recognitions/${recognition.id}`, { method: "PATCH", headers: { origin: "https://mothers-love.example" } }), { params: Promise.resolve({ id: recognition.id }) });
    expect(response.status).toBe(200);
    expect(databaseAction).toHaveBeenCalledWith("admin_mutate", expect.objectContaining({ mutation: "edit", fields: { recipient: "Cher" } }));
  });

  it("returns bare DisplaySettings for GET and PATCH", async () => {
    databaseAction.mockResolvedValueOnce({ data: { ok: true, settings }, error: null }).mockResolvedValueOnce({ data: { ok: true, settings }, error: null });
    const getResponse = await settingsRoute.GET(request("/api/admin/settings"));
    expect(await getResponse.json()).toEqual(settings);
    readJson.mockResolvedValue({ value: { expectedVersion: 3, changes: { mode: "quiet" } } });
    const patchResponse = await settingsRoute.PATCH(request("/api/admin/settings", { method: "PATCH", headers: { origin: "https://mothers-love.example" } }));
    expect(await patchResponse.json()).toEqual(settings);
  });

  it("returns a bare Aggregate for reports", async () => {
    databaseAction.mockResolvedValue({ data: { ok: true, aggregate }, error: null });
    const response = await reportsRoute.GET(request("/api/admin/reports?period=all"));
    expect(await response.json()).toEqual(aggregate);
  });

  it("generates an eight character pairing code and keeps devices list readable by moderators", async () => {
    databaseAction.mockResolvedValue({ data: { ok: true, id: "device-1", expiresAt: "2026-09-07T00:10:00Z" }, error: null });
    readJson.mockResolvedValue({ value: {} });
    const response = await devicesRoute.POST(request("/api/admin/devices", { method: "POST", headers: { origin: "https://mothers-love.example", "content-type": "application/json" }, body: "{}" }));
    const body = await response.json();
    expect(body.code).toHaveLength(8);
    expect(response.status).toBe(201);
    verifyAdmin.mockResolvedValue({ actor: { ...actor, role: "moderator", aal2: false } });
    databaseAction.mockResolvedValue({ data: { ok: true, items: [] }, error: null });
    const listResponse = await devicesRoute.GET(request("/api/admin/devices"));
    expect(await listResponse.json()).toEqual({ items: [] });
  });

  it("accepts the eight character display pairing code and returns only the paired flag", async () => {
    readJson.mockResolvedValue({ value: { code: "ABCDEFGH" } });
    databaseAction.mockResolvedValue({ data: { ok: true, paired: true }, error: null });
    const response = await pairRoute.POST(request("/api/display/pair", { method: "POST", headers: { origin: "https://mothers-love.example", "content-type": "application/json" }, body: "{}" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ paired: true });
  });
});
