import { expect, test } from "@playwright/test";

import { field, signOut, signUp } from "../support/auth";

test("a user creates a project and other users cannot see it", async ({ page }) => {
  await signUp(page, "Project Owner");
  await page.getByRole("link", { name: "Projects" }).first().click();
  await expect(page.getByText("No projects yet.")).toBeVisible();

  const name = `HR platform ${Date.now()}`;
  await field(page, "Project name").fill(name);
  await field(page, "Description (optional)").fill("Attendance, leave and payroll");
  await page.getByRole("button", { name: "Create project" }).click();

  const list = page.getByRole("list", { name: "Projects" });
  await expect(list.getByText(name)).toBeVisible();
  await expect(list.getByText("Draft")).toBeVisible();
  await expect(field(page, "Project name")).toHaveValue("");

  await signOut(page);
  await signUp(page, "Someone Else");
  await page.goto("/projects");
  await expect(page.getByText("No projects yet.")).toBeVisible();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("creating a project without a name shows a validation error", async ({ page }) => {
  await signUp(page, "Validation Tester");
  await page.goto("/projects");

  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByText("Enter a project name")).toBeVisible();
});
