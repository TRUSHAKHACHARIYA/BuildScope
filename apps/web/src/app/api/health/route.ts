import { connection } from "next/server";

import { checkBackend } from "@/features/system-status/api/check-backend";

/**
 * Browser-facing health proxy. The browser only talks to the web app; the API's
 * internal URL never leaves the server.
 */
export async function GET() {
  await connection();
  const result = await checkBackend();
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
