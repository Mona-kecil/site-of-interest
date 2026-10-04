import { expect, test } from "@playwright/test";

test("opens a lowercase bank symbol with NPL and no ROIC", async ({ page }) => {
  await page.goto("/company/bbca");
  await expect(page.getByRole("heading", { name: "Banks", exact: true })).toBeVisible();
  const npl = page.locator('[data-check="npl_ratio"]');
  await expect(npl.locator("header > strong")).toHaveText(/\d+\.\d+%/);
  await expect(page.locator('[data-check="roic"]')).toHaveCount(0);
  const verdict = page.getByRole("region", { name: "Worth a look", exact: true });
  await expect(verdict).toBeVisible();
  await expect(verdict).toContainText("Cash: Does not apply");
  await expect(verdict).toContainText("NPL ratio 1.65% · pass ≤ 3.00%");
  await expect(verdict.getByRole("link", { name: "View balance sheet inputs" })).toHaveAttribute("href", "#profile-banks");
});

test("explains a company price flag before the section navigation", async ({ page }) => {
  await page.goto("/company/DCII");
  const verdict = page.getByRole("region", { name: "Red flags", exact: true });
  await expect(verdict).toBeVisible();
  await expect(verdict).toContainText("Price: Fail");
  await expect(verdict).toContainText("Priced for perfection");
  await expect(verdict).toContainText("Current P/E 413.61× · flag > 50.00×");
  await verdict.getByRole("link", { name: "View price inputs" }).click();
  await expect(page).toHaveURL(/#profile-price$/);
});

test("opens cash conversion with its formula and source endpoint", async ({ page }) => {
  await page.goto("/company/ASII");
  const cash = page.locator('[data-check="cash_conversion"]');
  await expect(cash.getByRole("heading", { name: "Cash conversion", exact: true })).toBeVisible();
  await cash.getByText("Formula and inputs · Cash conversion", { exact: true }).click();
  await expect(cash.getByText("Formula", { exact: true })).toBeVisible();
  await expect(cash.getByText(/sum\(operating_cash_flow\[2023\.\.2025\]\)/)).toBeVisible();
  await expect(cash.getByText("Operating cash flow · FY2023", { exact: true })).toBeVisible();
  await expect(cash.getByText("Sectors · /v2/companies/ · batch 3 of 10 · rows 1–200 · 2 Oct 2026", { exact: true }).first()).toBeVisible();
  await expect(cash.getByText("IDR 33,746.00 bn", { exact: true })).toHaveAttribute("title", "33746000000000");
  await cash.getByText("Full endpoint", { exact: true }).first().click();
  await expect(cash.getByText(/\/v2\/companies\//).first()).toBeVisible();
  await expect(cash.locator(".source-endpoint[open] code").first()).toContainText("where=");
  await expect(cash.getByText("Retrieved", { exact: true }).first()).toBeVisible();
});

test("renders an unknown symbol with a return link", async ({ page }) => {
  await page.goto("/company/ZZZZ");
  await expect(page.getByRole("heading", { name: "Company not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Screener" })).toHaveAttribute("href", "/universe");
});

test("contains tables and expanded source endpoints at 390 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const symbol of ["ASII", "BBCA"]) {
    await page.goto(`/company/${symbol}`);
    await expect(page.locator(".profile-symbol")).toHaveText(symbol);
    await page.locator(".profile-evidence > summary").first().click();
    await page.getByText("Full endpoint", { exact: true }).first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const table = page.locator(".profile-table-wrap").first();
    const widths = await table.evaluate((element) => ({ table: element.scrollWidth, container: element.clientWidth }));
    expect(widths.table).toBeGreaterThan(widths.container);
  }
});

test("opens a company from its screener symbol and check panel", async ({ page }) => {
  await page.goto("/universe");
  await page.getByLabel("Search companies").fill("ASII");
  await page.evaluate(() => { (window as unknown as { researchNavigationMarker: string }).researchNavigationMarker = "retained"; });
  await page.getByRole("link", { name: "ASII", exact: true }).click();
  await expect(page).toHaveURL(/\/company\/ASII$/);
  await expect(page.locator('[data-check="cash_conversion"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { researchNavigationMarker: string }).researchNavigationMarker)).toBe("retained");
  await page.goto("/universe");
  await page.getByRole("button", { name: "ASII Cash conversion", exact: true }).click();
  await page.getByRole("link", { name: "Open company", exact: true }).click();
  await expect(page).toHaveURL(/\/company\/ASII$/);
});

test("links an entity holder to its owner page", async ({ page }) => {
  await page.goto("/company/AALI");
  await page.getByRole("link", { name: "PT Astra International Tbk", exact: true }).click();
  await expect(page).toHaveURL(/\/owner\/astra%20international$/);
  await expect(page.getByRole("link", { name: /ASII company page/ })).toBeVisible();
});

test("displays AALI dividends in IDR per share", async ({ page }) => {
  await page.goto("/company/AALI");
  const history = page.getByRole("region", { name: "Price against own history annual history · 2019–2025" });
  await expect(history.getByRole("columnheader", { name: "Dividend per share (IDR/share)" })).toBeVisible();
  for (const value of [91, 255, 444, 401, 249, 184]) await expect(history.getByRole("cell", { name: `IDR ${value}.00 per share`, exact: true })).toBeVisible();
  const check = page.locator('[data-check="dividend_years"]');
  await check.getByText("Formula and inputs · Dividend years", { exact: true }).click();
  await expect(check.getByText("Dividend per share · FY2025", { exact: true })).toBeVisible();
  await expect(check.getByText("IDR 184.00 per share", { exact: true })).toHaveAttribute("title", "184");
});

test("links ADRO's reported Edwin spelling to the merged owner", async ({ page }) => {
  await page.goto("/company/ADRO");
  const holder = page.getByRole("link", { name: "Edwin Soeryadjaja", exact: true });
  await expect(holder).toHaveAttribute("href", "/owner/edwin%20soeryadjaya");
  await holder.click();
  await expect(page).toHaveURL(/\/owner\/edwin%20soeryadjaya$/);
  await expect(page.getByRole("heading", { name: "Edwin Soeryadjaya", exact: true })).toBeVisible();
});

test("links IMJS's International holder spelling to the listed IMAS owner", async ({ page }) => {
  await page.goto("/company/IMJS");
  const holder = page.getByRole("link", { name: "PT Indomobil Sukses International Tbk", exact: true });
  await expect(holder).toHaveAttribute("href", "/owner/indomobil%20sukses%20internasional");
  await holder.click();
  await expect(page).toHaveURL(/\/owner\/indomobil%20sukses%20internasional$/);
  const company = page.getByRole("link", { name: "IMAS company page →", exact: true });
  await expect(company).toHaveAttribute("href", "/company/IMAS");
  await company.click();
  await expect(page).toHaveURL(/\/company\/IMAS$/);
});
