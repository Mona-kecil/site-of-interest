import { expect, test } from "@playwright/test";

test("opens Focus, filters missing coverage, and follows a company", async ({ page }) => {
  await page.goto("/focus/prajogo");
  await expect(page.getByRole("heading", { level: 1, name: "Where to look next" })).toBeVisible();
  const rows = page.locator(".focus-table tbody tr");
  await expect(rows).toHaveCount(10);
  await expect(rows.first()).toContainText("CDIA");
  await page.getByLabel("Incomplete board coverage").check();
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("CDIA");
  await page.getByLabel("Cycle state").selectOption("incomplete");
  await expect(rows).toHaveCount(1);
  await rows.first().getByRole("link", { name: /CDIA/ }).click();
  await expect(page).toHaveURL(/\/empire\/prajogo\/company\/CDIA$/);
  await expect(page.getByRole("heading", { level: 1, name: "CDIA" })).toBeVisible();
});

test("Focus table stays inside the document at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/focus/prajogo");
  await expect(page.locator(".focus-table tbody tr")).toHaveCount(10);
  const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
});
