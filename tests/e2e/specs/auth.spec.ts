import { expect, test } from "@playwright/test";

import { field, formAlert, signIn, signOut, signUp, uniqueEmail } from "../support/auth";

test("protected pages redirect to sign in and come back afterwards", async ({ page }) => {
  const email = await signUp(page, "Return Tester");
  await signOut(page);

  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects$/);

  await signIn(page, email);
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
});

test("wrong password shows an error and stays on sign in", async ({ page }) => {
  const email = await signUp(page, "Wrong Password");
  await signOut(page);

  await signIn(page, email, "not-the-password");

  await expect(formAlert(page)).toHaveText("Incorrect email or password.");
  await expect(page).toHaveURL(/\/login/);
});

test("signing up twice with the same email is rejected", async ({ page }) => {
  const email = await signUp(page, "First Signup");
  await signOut(page);

  await page.goto("/signup");
  await field(page, "Name").fill("Second Signup");
  await field(page, "Email").fill(email);
  await field(page, "Password").fill("another-password");
  await field(page, "Confirm password").fill("another-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(formAlert(page)).toContainText("already exists");
});

test("signed-in users are sent from sign in to the dashboard", async ({ page }) => {
  await signUp(page, "Already In");

  await page.goto("/login");

  await expect(page).toHaveURL(/\/dashboard$/);
});

test("signup form validates input before submitting", async ({ page }) => {
  await page.goto("/signup");
  await field(page, "Email").fill(uniqueEmail());
  await field(page, "Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Enter your name")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  await expect(page).toHaveURL(/\/signup$/);
});
