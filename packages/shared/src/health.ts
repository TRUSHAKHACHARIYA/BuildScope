/**
 * Health contracts shared between the API (apps/api) and the web app (apps/web).
 * Keep in sync with `apps/api/app/schemas/health.py`.
 */

export type ServiceStatus = "ok" | "degraded" | "error";

export type DependencyStatus = "ok" | "error";

export interface HealthResponse {
  status: ServiceStatus;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  checks: Record<string, DependencyStatus>;
}
