import { describe, expect, it, vi } from "vitest";
import { ApiClientError, api } from "@/lib/client-api";

describe("client API helper", () => {
  it("adds credentials and an explicit bearer token without logging payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api<{ ok: boolean }>("/api/config", { token: "synthetic-token" })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer synthetic-token");
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
  });

  it("turns structured API errors into ApiClientError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unavailable", code: "service_unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(api("/api/config", { auth: false })).rejects.toMatchObject({
      name: "ApiClientError",
      status: 503,
      code: "service_unavailable",
      message: "Unavailable",
    });
  });

  it("uses a safe network error without exposing request data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("synthetic transport detail")));

    const error = await api("/api/config", { auth: false }).catch((candidate) => candidate);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 0, code: "network_error" });
    expect((error as Error).message).not.toContain("synthetic transport detail");
  });
});
