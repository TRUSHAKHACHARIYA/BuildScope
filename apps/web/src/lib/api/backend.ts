import "server-only";

import { redirect } from "next/navigation";

import { getApiToken } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/server-env";

export class BackendError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

/**
 * Calls the BuildScope API as the signed-in user. Runs on the server only, so neither the
 * API URL nor the token reaches the browser. A 401 sends the user back to /login.
 */
export async function backendFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { API_INTERNAL_URL, API_TIMEOUT_MS } = getServerEnv();
  const token = await getApiToken();

  let response: Response;
  try {
    response = await fetch(new URL(path, API_INTERNAL_URL), {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
        authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new BackendError(503, "The BuildScope API is not reachable. Try again shortly.");
  }

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    throw new BackendError(response.status, await readErrorDetail(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readErrorDetail(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  if (body && typeof body.detail === "string") return body.detail;
  return `Request failed (HTTP ${response.status})`;
}
