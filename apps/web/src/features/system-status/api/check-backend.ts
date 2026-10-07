import "server-only";

import { getServerEnv } from "@/lib/server-env";

import { healthResponseSchema, type BackendConnection } from "../types";

/**
 * Calls the FastAPI health endpoint from the server. Failures are returned as a
 * structured `unreachable` result rather than thrown, so callers never crash.
 */
export async function checkBackend(fetchImpl: typeof fetch = fetch): Promise<BackendConnection> {
  const { API_INTERNAL_URL, API_TIMEOUT_MS } = getServerEnv();
  const url = new URL("/api/v1/health", API_INTERNAL_URL);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return {
      state: "unreachable",
      reason: timedOut ? "Backend did not respond in time" : "Backend is not reachable",
    };
  }

  // The API answers 503 with a valid body when a dependency (e.g. the database) is down.
  if (!response.ok && response.status !== 503) {
    return { state: "unreachable", reason: `Backend responded with HTTP ${response.status}` };
  }

  const parsed = healthResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    return { state: "unreachable", reason: "Backend returned an unexpected health payload" };
  }
  return { state: "connected", health: parsed.data };
}
