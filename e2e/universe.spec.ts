import { expect, test } from "@playwright/test";

test("screens the IDX universe and opens a bank check's sourced calculation", async ({ page }) => {
  await page.goto("/universe");
  await expect(page.getByRole("heading", { name: "Universe", exact: true })).toBeVisible();
  const rows = page.locator(".universe-table tbody tr");
  await expect.poll(() => rows.count()).toBeGreaterThan(900);
  await page.getByLabel("Sub-sector", { exact: true }).selectOption("Banks");
  await page.getByRole("tab", { name: "Banks", exact: true }).click();
  await expect(rows).toHaveCount(48);
  const npl = page.getByRole("button", { name: /^\w+ NPL ratio$/ });
  await expect(npl.filter({ hasText: "%" }).first()).toBeVisible();
  const first = await rows.first().getAttribute("data-symbol");
  await page.getByRole("button", { name: "Symbol ↑", exact: true }).click();
  await expect(rows.first()).not.toHaveAttribute("data-symbol", first!);
  await npl.filter({ hasText: "%" }).first().click();
  const panel = page.getByRole("complementary", { name: "Check details" });
  await expect(panel.getByText("Formula", { exact: true })).toBeVisible();
  await expect(panel.getByText("non_performing_loan[2025] / gross_loan[2025]", { exact: true })).toBeVisible();
  await expect(panel.getByText(/\/v2\/companies\//).first()).toBeVisible();
  await expect(panel.getByText("Retrieved", { exact: true }).first()).toBeVisible();
});

test("contains horizontal table scrolling at 390 pixels and exposes gaps on focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/universe");
  await expect.poll(() => page.locator(".universe-table tbody tr").count()).toBeGreaterThan(900);
  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    table: document.querySelector(".universe-table-wrap")!.scrollWidth,
    container: document.querySelector(".universe-table-wrap")!.clientWidth,
  }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  expect(widths.table).toBeGreaterThan(widths.container);
  const gap = page.locator(".universe-cell[aria-describedby]").first();
  await gap.focus();
  await expect(gap.locator("..").getByRole("tooltip")).toBeVisible();
});
