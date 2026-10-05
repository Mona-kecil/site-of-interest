import { expect, test } from "@playwright/test";

test("opens the landing with the tally, ratings and a looked-up ticker", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /^\d+ of 962 IDX companies are worth a look\. \d+ raise a red flag\.$/,
  );
  const chart = page.getByRole("region", { name: "The ratings" });
  await expect(chart.locator("tbody tr")).toHaveCount(8);
  await page.getByRole("combobox").fill("BREN");
  await page.getByRole("option", { name: /^BREN/ }).click();
  await expect(chart.locator("tbody tr")).toHaveCount(9);
  await expect(chart.locator("tbody tr").first()).toContainText("BREN");
  await page.getByRole("button", { name: "Show the numbers" }).click();
  await expect(page.getByRole("button", { name: "Show the numbers" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText(/Not investment advice\./)).toBeVisible();
  await page.getByRole("link", { name: /Open Telkom’s full evidence/ }).click();
  await expect(page).toHaveURL(/\/company\/TLKM$/);
});

test("contains the landing at 390 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "The ratings" }).locator("tbody tr")).toHaveCount(
    8,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("opens Ideas with both lists, rules and company reasons", async ({ page }) => {
  await page.goto("/ideas");
  await expect(page.getByRole("heading", { name: "Ideas", exact: true })).toBeVisible();
  await expect(page.getByText(/screens all 962 IDX companies/)).toBeVisible();
  const ideas = page.getByRole("region", { name: /^Worth a look ·/ });
  const flags = page.getByRole("region", { name: /^Red flags ·/ });
  await expect(ideas.getByRole("article")).toHaveCount(12);
  await expect(flags.getByRole("article")).toHaveCount(12);
  await expect(ideas.getByRole("article").first().locator(".idea-reasons")).toContainText(
    "· pass ",
  );
  await expect(flags.getByRole("article").first().locator(".idea-reasons")).toContainText(
    "· flag ",
  );
  const dcii = flags.locator('[data-symbol="DCII"]');
  await expect(dcii).toContainText("Priced for perfection");
  await expect(dcii).toContainText("Current P/E 413.61× · flagged above 50");
  await page.getByText("How a stock makes the list", { exact: true }).click();
  await expect(page.locator(".ideas-method")).toContainText(
    "Cash conversion: passes at 0.8× or more · flagged below 0.5×",
  );
  await ideas.getByRole("button", { name: /^Show all/ }).click();
  await expect.poll(() => ideas.getByRole("article").count()).toBeGreaterThan(12);
  await flags.getByRole("button", { name: /^Show all/ }).click();
  await expect.poll(() => flags.getByRole("article").count()).toBeGreaterThan(12);
  await ideas.getByRole("link", { name: "TLKM", exact: true }).click();
  await expect(page).toHaveURL(/\/company\/TLKM$/);
  await page
    .getByRole("navigation", { name: "Product sections" })
    .getByRole("link", { name: "Ideas", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ideas$/);
  await page
    .getByRole("navigation", { name: "Product sections" })
    .getByRole("link", { name: "Screener", exact: true })
    .click();
  await expect(page).toHaveURL(/\/universe$/);
  await page.getByRole("link", { name: "Site of Interest", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("contains Ideas cards and expanded rules at 390 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ideas");
  await expect(
    page.getByRole("region", { name: /^Worth a look ·/ }).getByRole("article"),
  ).toHaveCount(12);
  await page.getByText("How a stock makes the list", { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("screens the IDX universe and opens a bank check's sourced calculation", async ({ page }) => {
  await page.goto("/universe");
  await expect(page.getByRole("heading", { name: "Screener", exact: true })).toBeVisible();
  const rows = page.locator(".universe-table tbody tr");
  await expect.poll(() => rows.count()).toBeGreaterThan(900);
  await page.getByRole("combobox", { name: "Sub-sector" }).selectOption("Banks");
  await page.getByRole("tab", { name: "Banks", exact: true }).click();
  await expect(rows).toHaveCount(48);
  const npl = page.getByRole("button", { name: /^\w+ NPL ratio$/ });
  await expect(npl.filter({ hasText: "%" }).first()).toBeVisible();
  const first = await rows.first().getAttribute("data-symbol");
  await page.getByRole("button", { name: "Symbol ↑", exact: true }).click();
  await expect(rows.first()).not.toHaveAttribute("data-symbol", first!);
  await npl.filter({ hasText: "%" }).first().click();
  const panel = page.getByRole("complementary", { name: "Check details" });
  await expect(
    panel.getByRole("heading", { name: "How it’s calculated", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByText("Non-performing loans divided by gross loans.", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByText("Non-performing loans, 2025", { exact: true })).toBeVisible();
  await expect(panel.getByText("Gross loans, 2025", { exact: true })).toBeVisible();
  await expect(
    panel.getByText("Source: Sectors, retrieved 2 Oct 2026.", { exact: true }),
  ).toBeVisible();
});

test("contains horizontal table scrolling at 390 pixels and exposes gaps on focus", async ({
  page,
}) => {
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
  const sortHeights = await page
    .locator(".universe-table thead button:visible")
    .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(sortHeights.length).toBeGreaterThan(0);
  expect(sortHeights.every((height) => height >= 44)).toBe(true);
  const gap = page.locator(".universe-cell[aria-describedby]").first();
  await gap.focus();
  await expect(gap.locator("..").getByRole("tooltip")).toBeVisible();
});

test("filters the screener by verdict alongside company search", async ({ page }) => {
  await page.goto("/universe");
  await page.getByLabel("Search companies").fill("TLKM");
  await page.getByRole("combobox", { name: "Verdict", exact: true }).selectOption("idea");
  await expect(page.locator(".universe-table tbody tr")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Verdict", exact: true }).selectOption("flags");
  await expect(page.locator(".universe-table tbody tr")).toHaveCount(0);
  await page.getByLabel("Search companies").fill("DCII");
  await expect(page.locator(".universe-table tbody tr")).toHaveCount(1);
});

test("shows AADI's cash gap category without a percentile line", async ({ page }) => {
  await page.goto("/universe");
  await page.getByLabel("Search companies").fill("AADI");
  const gap = page.getByRole("button", { name: "AADI Cash conversion", exact: true });
  await expect(gap).toHaveText("No data");
  await expect(gap).not.toContainText(/p\s+n\/a|peers/);
  await gap.focus();
  await expect(gap.locator("..").getByRole("tooltip")).toHaveText(
    "No data for operating cash flow 2023.",
  );
  await gap.click();
  const panel = page.getByRole("complementary", { name: "Check details" });
  await expect(
    panel.getByText("No data for operating cash flow 2023.", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByText("Sub-sector percentile", { exact: true })).toHaveCount(0);
});
