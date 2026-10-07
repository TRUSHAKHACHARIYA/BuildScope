import { describe, expect, it, vi } from "vitest";

import type { HealthResponse } from "@buildscope/shared";

import { checkBackend } from "./check-backend";

const healthy: HealthResponse = {
  status: "ok",
  service: "buildscope-api",
  version: "0.1.0",
  environment: "test",
  timestamp: "2026-10-07T00:00:00Z",
  checks: { database: "ok" },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("checkBackend", () => {
  it("calls the versioned health endpoint on the configured API URL", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api:8000");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(healthy));

    await checkBackend(fetchMock);

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.toString()).toBe("http://api:8000/api/v1/health");
  });

  it("returns connected with the parsed health payload", async () => {
    const result = await checkBackend(vi.fn().mockResolvedValue(jsonResponse(healthy)));
    expect(result).toEqual({ state: "connected", health: healthy });
  });

  it("treats a 503 with a valid body as connected but degraded", async () => {
    const degraded = { ...healthy, status: "degraded", checks: { database: "error" } };
    const result = await checkBackend(vi.fn().mockResolvedValue(jsonResponse(degraded, 503)));
    expect(result).toEqual({ state: "connected", health: degraded });
  });

  it("reports other HTTP errors as unreachable", async () => {
    const result = await checkBackend(
      vi.fn().mockResolvedValue(new Response("boom", { status: 500 })),
    );
    expect(result).toEqual({ state: "unreachable", reason: "Backend responded with HTTP 500" });
  });

  it("reports network failures as unreachable", async () => {
    const result = await checkBackend(vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(result).toEqual({ state: "unreachable", reason: "Backend is not reachable" });
  });

  it("reports timeouts distinctly", async () => {
    const timeout = new DOMException("The operation timed out.", "TimeoutError");
    const result = await checkBackend(vi.fn().mockRejectedValue(timeout));
    expect(result).toEqual({ state: "unreachable", reason: "Backend did not respond in time" });
  });

  it("rejects payloads that do not match the health contract", async () => {
    const result = await checkBackend(vi.fn().mockResolvedValue(jsonResponse({ hello: "world" })));
    expect(result).toEqual({
      state: "unreachable",
      reason: "Backend returned an unexpected health payload",
    });
  });
});
