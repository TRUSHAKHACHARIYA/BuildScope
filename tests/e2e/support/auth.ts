import { expect, type Page } from "@playwright/test";

/** A visible form field by its exact label (Next keeps hidden copies of visited pages). */
export function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

/** The form's error alert (not Next's route announcer, which also has role="alert"). */
export function formAlert(page: Page) {
  return page.locator('[data-slot="alert"]').filter({ visible: true });
}

export const PASSWORD = "correct-horse-battery";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function signUp(page: Page, name: string, email = uniqueEmail()) {
  await page.goto("/signup");
  await field(page, "Name").fill(name);
  await field(page, "Email").fill(email);
  await field(page, "Password").fill(PASSWORD);
  await field(page, "Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await field(page, "Email").fill(email);
  await field(page, "Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}
