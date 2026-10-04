import { expect, test } from "@playwright/test";

test("opens a lowercase bank symbol with NPL and no ROIC", async ({ page }) => {
  await page.goto("/company/bbca");
  await expect(page.getByRole("heading", { name: "Banks", exact: true })).toBeVisible();
  const npl = page.locator('[data-check="npl_ratio"]');
  await expect(npl.locator("header > strong")).toHaveText(/\d+\.\d+%/);
  await expect(page.locator('[data-check="roic"]')).toHaveCount(0);
});

test("opens cash conversion with its formula and source endpoint", async ({ page }) => {
  await page.goto("/company/ASII");
  const cash = page.locator('[data-check="cash_conversion"]');
  await expect(cash.getByRole("heading", { name: "Cash conversion", exact: true })).toBeVisible();
  await cash.getByText("Formula and inputs · Cash conversion", { exact: true }).click();
  await expect(cash.getByText("Formula", { exact: true })).toBeVisible();
  await expect(cash.getByText(/sum\(operating_cash_flow\[2023\.\.2025\]\)/)).toBeVisible();
  await expect(cash.getByText(/\/v2\/companies\//).first()).toBeVisible();
  await expect(cash.getByText("Retrieved", { exact: true }).first()).toBeVisible();
});

test("renders an unknown symbol with a return link", async ({ page }) => {
  await page.goto("/company/ZZZZ");
  await expect(page.getByRole("heading", { name: "Company not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Universe" })).toHaveAttribute("href", "/universe");
});

test("contains tables and expanded source endpoints at 390 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const symbol of ["ASII", "BBCA"]) {
    await page.goto(`/company/${symbol}`);
    await expect(page.locator(".profile-symbol")).toHaveText(symbol);
    await page.locator(".profile-evidence > summary").first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const table = page.locator(".profile-table-wrap").first();
    const widths = await table.evaluate((element) => ({ table: element.scrollWidth, container: element.clientWidth }));
    expect(widths.table).toBeGreaterThan(widths.container);
  }
});

test("opens a company from its screener symbol and check panel", async ({ page }) => {
  await page.goto("/universe");
  await page.getByLabel("Search companies").fill("ASII");
  await page.getByRole("link", { name: "ASII", exact: true }).click();
  await expect(page).toHaveURL(/\/company\/ASII$/);
  await expect(page.locator('[data-check="cash_conversion"]')).toBeVisible();
  await page.goto("/universe");
  await page.getByRole("button", { name: "ASII Cash conversion", exact: true }).click();
  await page.getByRole("link", { name: "Open company", exact: true }).click();
  await expect(page).toHaveURL(/\/company\/ASII$/);
});

test("redirects the old empire company route", async ({ page }) => {
  await page.goto("/empire/prajogo/company/BBCA");
  await expect(page).toHaveURL(/\/company\/BBCA$/);
  await expect(page.getByRole("heading", { name: "Banks", exact: true })).toBeVisible();
});

test("links an entity holder to its owner page", async ({ page }) => {
  await page.goto("/company/AALI");
  await page.getByRole("link", { name: "PT Astra International Tbk", exact: true }).click();
  await expect(page).toHaveURL(/\/owner\/astra%20international$/);
  await expect(page.getByRole("link", { name: /ASII company page/ })).toBeVisible();
});
