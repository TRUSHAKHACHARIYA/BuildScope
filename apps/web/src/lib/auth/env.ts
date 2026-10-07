import "server-only";

import { z } from "zod";

const authEnvSchema = z.object({
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  AUTH_DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "AUTH_DATABASE_URL must be a postgresql:// URL")
    .default("postgresql://buildscope:buildscope@localhost:5432/buildscope"),
  AUTH_JWT_AUDIENCE: z.string().min(1).default("buildscope-api"),
  // Throttles sign-in/sign-up attempts per IP. Disable only for automated end-to-end test runs.
  AUTH_RATE_LIMIT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function getAuthEnv(source: NodeJS.ProcessEnv = process.env): AuthEnv {
  return authEnvSchema.parse({
    BETTER_AUTH_URL: source.BETTER_AUTH_URL || undefined,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    AUTH_DATABASE_URL: source.AUTH_DATABASE_URL || undefined,
    AUTH_JWT_AUDIENCE: source.AUTH_JWT_AUDIENCE || undefined,
    AUTH_RATE_LIMIT_ENABLED: source.AUTH_RATE_LIMIT_ENABLED || undefined,
  });
}
