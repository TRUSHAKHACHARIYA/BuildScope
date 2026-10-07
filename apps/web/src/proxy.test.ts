import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

const SESSION_COOKIE = "buildscope.session_token=abc.def";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  });
}

describe("proxy", () => {
  it("redirects signed-out users to /login with a return path", () => {
    const response = proxy(request("/projects?tab=all"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/projects?tab=all");
  });

  it("lets signed-out users reach the auth pages", () => {
    expect(proxy(request("/login")).headers.get("location")).toBeNull();
    expect(proxy(request("/signup")).headers.get("location")).toBeNull();
  });

  it("lets users with a session cookie through", () => {
    expect(proxy(request("/dashboard", SESSION_COOKIE)).headers.get("location")).toBeNull();
  });

  it("sends signed-in users away from the auth pages", () => {
    const response = proxy(request("/login", SESSION_COOKIE));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
  });
});
