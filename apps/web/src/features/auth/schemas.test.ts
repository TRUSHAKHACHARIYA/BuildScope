import { describe, expect, it } from "vitest";

import { authErrorMessage, loginSchema, signupSchema } from "./schemas";

describe("loginSchema", () => {
  it("normalises the email", () => {
    const parsed = loginSchema.parse({ email: "  Ada@Example.COM ", password: "x" });
    expect(parsed.email).toBe("ada@example.com");
  });

  it.each([
    [{ email: "not-an-email", password: "x" }, "email"],
    [{ email: "a@b.co", password: "" }, "password"],
  ])("rejects %j", (input, field) => {
    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});

describe("signupSchema", () => {
  const valid = {
    name: "Ada",
    email: "ada@example.com",
    password: "correct-horse",
    confirmPassword: "correct-horse",
  };

  it("accepts valid input", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    [{ name: "   " }, "name"],
    [{ password: "short", confirmPassword: "short" }, "password"],
    [{ password: "x".repeat(129), confirmPassword: "x".repeat(129) }, "password"],
    [{ confirmPassword: "different" }, "confirmPassword"],
  ])("rejects %j", (override, field) => {
    const result = signupSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});

describe("authErrorMessage", () => {
  it.each([
    [{ code: "INVALID_EMAIL_OR_PASSWORD" }, "Incorrect email or password."],
    [{ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }, /already exists/],
    [{ status: 429 }, /Too many attempts/],
    [{ code: "SOMETHING_NEW" }, "Something went wrong. Please try again."],
    [null, "Something went wrong. Please try again."],
  ])("maps %j", (error, expected) => {
    expect(authErrorMessage(error)).toMatch(expected);
  });
});
