import { describe, expect, it } from "vitest";

import { getAuthEnv } from "./env";

const SECRET = "x".repeat(32);

describe("getAuthEnv", () => {
  it("applies defaults", () => {
    expect(getAuthEnv({ BETTER_AUTH_SECRET: SECRET } as unknown as NodeJS.ProcessEnv)).toEqual({
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: SECRET,
      AUTH_DATABASE_URL: "postgresql://buildscope:buildscope@localhost:5432/buildscope",
      AUTH_JWT_AUDIENCE: "buildscope-api",
      AUTH_RATE_LIMIT_ENABLED: true,
    });
  });

  it("can disable rate limiting explicitly", () => {
    const env = getAuthEnv({
      BETTER_AUTH_SECRET: SECRET,
      AUTH_RATE_LIMIT_ENABLED: "false",
    } as unknown as NodeJS.ProcessEnv);
    expect(env.AUTH_RATE_LIMIT_ENABLED).toBe(false);
  });

  it.each<[Record<string, string>, string]>([
    [{}, "missing secret"],
    [{ BETTER_AUTH_SECRET: "too-short" }, "short secret"],
    [{ BETTER_AUTH_SECRET: SECRET, AUTH_DATABASE_URL: "postgresql+asyncpg://x" }, "asyncpg scheme"],
    [{ BETTER_AUTH_SECRET: SECRET, AUTH_RATE_LIMIT_ENABLED: "no" }, "bad boolean"],
  ])("rejects %j (%s)", (env) => {
    expect(() => getAuthEnv(env as unknown as NodeJS.ProcessEnv)).toThrow();
  });
});
