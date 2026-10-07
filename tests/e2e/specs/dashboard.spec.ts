import { expect, test } from "@playwright/test";

import { signUp } from "../support/auth";

test("root sends signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

test("dashboard shows the product name and a connected backend", async ({ page }) => {
  await signUp(page, "Dashboard Tester");

  await expect(page.getByRole("heading", { level: 1, name: "BuildScope" })).toBeVisible();
  await expect(page.getByText("Welcome back, Dashboard Tester.")).toBeVisible();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  await expect(page.getByText("buildscope-api")).toBeVisible();
});
