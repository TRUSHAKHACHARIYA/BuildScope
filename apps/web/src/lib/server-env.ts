import "server-only";

import { z } from "zod";

/**
 * Server-side environment. Never import this module from a Client Component:
 * the API's internal URL and any future secrets must stay on the server.
 */
const serverEnvSchema = z.object({
  API_INTERNAL_URL: z.url().default("http://localhost:8000"),
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse({
    API_INTERNAL_URL: source.API_INTERNAL_URL || undefined,
    API_TIMEOUT_MS: source.API_TIMEOUT_MS || undefined,
  });
}
