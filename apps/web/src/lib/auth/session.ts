import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getAuth } from "./server";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Data Access Layer entry point: the signed-in user, or a redirect to /login.
 * Reads the request, so callers must render behind a <Suspense> boundary.
 * Deduplicated per request with React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser> => {
  // Read the request first: during prerendering this defers the work to request time.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) redirect("/login");
  const { id, name, email } = session.user;
  return { id, name, email };
});

/** A short-lived JWT for calling the BuildScope API on behalf of the signed-in user. */
export async function getApiToken(): Promise<string> {
  const requestHeaders = await headers();
  try {
    const { token } = await getAuth().api.getToken({ headers: requestHeaders });
    return token;
  } catch {
    // No valid session (expired or signed out elsewhere).
    redirect("/login");
  }
}
