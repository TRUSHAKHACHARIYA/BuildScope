import { z } from "zod";

import type { HealthResponse } from "@buildscope/shared";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  timestamp: z.string(),
  checks: z.record(z.string(), z.enum(["ok", "error"])),
}) satisfies z.ZodType<HealthResponse>;

/** What the web app's `/api/health` route returns to the browser. */
export type BackendConnection =
  { state: "connected"; health: HealthResponse } | { state: "unreachable"; reason: string };
