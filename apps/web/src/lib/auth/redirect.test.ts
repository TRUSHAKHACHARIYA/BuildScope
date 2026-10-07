import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it.each(["/projects", "/projects/123?tab=gaps", "/dashboard#top"])("allows %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.example",
    "//evil.example/path",
    "/\\evil.example",
    "javascript:alert(1)",
    "projects",
  ])("falls back for %s", (value) => {
    expect(safeRedirectPath(value)).toBe("/dashboard");
  });
});
