import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

import { AUTH_COOKIE_PREFIX } from "./constants";
import { getAuthEnv } from "./env";

/**
 * Better Auth runs inside the Next.js server. Its tables are created by the API's Alembic
 * migrations (single migration history); the names below map Better Auth's models onto them.
 *
 * The `jwt` plugin issues short-lived tokens that the FastAPI backend verifies via `/api/auth/jwks`.
 */
const timestamps = { createdAt: "created_at", updatedAt: "updated_at" } as const;

function createAuth() {
  const env = getAuthEnv();
  return betterAuth({
    appName: "BuildScope",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: new Pool({ connectionString: env.AUTH_DATABASE_URL, max: 10 }),
    rateLimit: {
      enabled: env.AUTH_RATE_LIMIT_ENABLED,
      window: 60,
      max: 100,
      // Stricter limits for credential endpoints (per IP).
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    session: {
      modelName: "sessions",
      fields: {
        ...timestamps,
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
      },
    },
    user: {
      modelName: "users",
      fields: { ...timestamps, emailVerified: "email_verified" },
    },
    account: {
      modelName: "accounts",
      fields: {
        ...timestamps,
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
      },
    },
    verification: {
      modelName: "verifications",
      fields: { ...timestamps, expiresAt: "expires_at" },
    },
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      database: { generateId: "uuid" },
    },
    plugins: [
      jwt({
        jwt: {
          issuer: env.BETTER_AUTH_URL,
          audience: env.AUTH_JWT_AUDIENCE,
          expirationTime: "15m",
          // Identity only (`sub` = user id, plus iss/aud/iat/exp): no profile data in tokens.
          definePayload: () => ({}),
        },
        schema: {
          jwks: {
            modelName: "jwks",
            fields: {
              publicKey: "public_key",
              privateKey: "private_key",
              createdAt: "created_at",
              expiresAt: "expires_at",
            },
          },
        },
      }),
      // Must be last: lets Server Actions set auth cookies.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

/**
 * The auth instance is created on first use, not at import time, so `next build` does not need
 * runtime secrets (they are validated when the server handles its first auth request).
 */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
