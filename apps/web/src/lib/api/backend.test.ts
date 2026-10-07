import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/lib/auth/session", () => ({ getApiToken: vi.fn(async () => "test-token") }));

const { BackendError, backendFetch } = await import("./backend");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("backendFetch", () => {
  beforeEach(() => {
    vi.stubEnv("API_INTERNAL_URL", "http://api:8000");
  });

  it("sends the bearer token to the configured API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(backendFetch("/api/v1/me")).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("http://api:8000/api/v1/me");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-token");
  });

  it("does not let callers override the authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal("fetch", fetchMock);

    await backendFetch("/x", { headers: { authorization: "Bearer forged" } });

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-token");
  });

  it("sets a JSON content type when sending a body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 201));
    vi.stubGlobal("fetch", fetchMock);

    await backendFetch("/x", { method: "POST", body: "{}" });

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
  });

  it("redirects to /login on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail: "Not authenticated" }, 401)));

    await expect(backendFetch("/x")).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("surfaces the API's error detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail: "Project not found" }, 404)));

    await expect(backendFetch("/x")).rejects.toEqual(new BackendError(404, "Project not found"));
  });

  it("uses a generic message when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));

    await expect(backendFetch("/x")).rejects.toThrow("Request failed (HTTP 500)");
  });

  it("reports network failures as 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(backendFetch("/x")).rejects.toMatchObject({ status: 503 });
  });

  it("returns undefined for 204 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(backendFetch("/x", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
