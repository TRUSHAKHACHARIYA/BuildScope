import { describe, expect, it } from "vitest";

import { getServerEnv } from "./server-env";

describe("getServerEnv", () => {
  it("applies defaults when variables are unset", () => {
    expect(getServerEnv({} as NodeJS.ProcessEnv)).toEqual({
      API_INTERNAL_URL: "http://localhost:8000",
      API_TIMEOUT_MS: 3000,
    });
  });

  it("reads and coerces configured values", () => {
    const env = getServerEnv({
      API_INTERNAL_URL: "http://api:8000",
      API_TIMEOUT_MS: "1500",
    } as unknown as NodeJS.ProcessEnv);
    expect(env).toEqual({ API_INTERNAL_URL: "http://api:8000", API_TIMEOUT_MS: 1500 });
  });

  it("rejects an invalid API URL", () => {
    expect(() =>
      getServerEnv({ API_INTERNAL_URL: "not a url" } as unknown as NodeJS.ProcessEnv),
    ).toThrow();
  });
});
