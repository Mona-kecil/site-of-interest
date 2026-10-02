import { expect, test } from "@playwright/test";

test("compares one definition and period, then opens its provider evidence", async ({ page }) => {
  await page.goto("/happening");
  await expect(page.getByRole("heading", { name: "What’s happening?" })).toBeVisible();
  await page.getByLabel("Metric").selectOption("revenue_yoy");
  await page.getByLabel("Period").selectOption("FY2025");
  await page.getByLabel("Sort").selectOption("highest");
  await expect(page.getByText("Revenue year over year · FY2025").first()).toBeVisible();

  const rows = page.locator(".today-inspector-row");
  await expect(rows).toHaveCount(10);
  await expect(rows.first()).toContainText("TPIA");
  await rows.filter({ hasText: "BRPT" }).click();
  await expect(page.getByRole("heading", { name: "Calculation · v1" })).toBeVisible();
  await expect(page.locator(".today-company-measurement").first()).toBeVisible();
  expect(await page.locator(".today-company-measurement").count()).toBeGreaterThan(3);
  await expect(page.getByText("FY2025 revenue").last()).toBeVisible();
  await expect(page.getByText("financials.historical_financials[year=2024].revenue")).toBeVisible();
  await page.getByRole("link", { name: "Open full company record" }).click();
  await expect(page).toHaveURL(/\/empire\/prajogo\/company\/BRPT$/);
  await expect(page.getByRole("heading", { level: 1, name: "BRPT" })).toBeVisible();
  await expect(page.getByRole("link", { name: /prajogo Empire/i })).toBeVisible();
});

test("keeps date controls in place and shows uncollected domains honestly", async ({ page }) => {
  await page.goto("/happening");
  const initialTop = await page.getByLabel("From").boundingBox();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByRole("button", { name: "Today", exact: true })).toHaveClass(/is-active/);
  const todayTop = await page.getByLabel("From").boundingBox();
  expect(Math.abs((todayTop?.y ?? 0) - (initialTop?.y ?? 0))).toBeLessThanOrEqual(4);
  await page.getByRole("button", { name: "Yesterday", exact: true }).click();
  await expect(page.getByRole("button", { name: "Yesterday", exact: true })).toHaveClass(
    /is-active/,
  );
  await page.getByLabel("From").fill("2025-12-31");
  await page.getByLabel("To", { exact: true }).fill("2025-12-31");
  await expect(page.locator(".today-inspector-row").first()).toBeVisible();
  await page.getByRole("button", { name: "Show more records" }).click();
  await expect.poll(() => page.locator(".today-inspector-row").count()).toBeGreaterThan(50);
  await page
    .getByRole("region", { name: "Filter records" })
    .getByRole("button", { name: "broker", exact: true })
    .click();
  await expect(
    page.getByText(
      "No stored broker records match this range. An empty range is a coverage gap, not zero activity.",
    ),
  ).toBeVisible();
});

test("opens a broker measurement and its exact trading-day rows", async ({ page }) => {
  await page.goto("/happening");
  await page
    .getByRole("region", { name: "Filter records" })
    .getByRole("button", { name: "broker", exact: true })
    .click();
  const firstDate = await page
    .locator(".today-inspector-row time")
    .first()
    .getAttribute("dateTime");
  expect(firstDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await expect(
    page.getByRole("heading", { name: `All broker rows on ${firstDate}` }),
  ).toBeVisible();
  await expect(
    page.getByText("broker buy value / sum of all broker buy values × 100"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open Empire context" }).click();
  await page.getByRole("link", { name: "Return to record" }).click();
  await expect(page.getByRole("heading", { name: `All broker rows on ${firstDate}` })).toBeVisible();
  await page.getByRole("link", { name: "Open full company record" }).click();
  await expect(page.getByRole("heading", { name: "Broker flow" })).toBeVisible();
  await expect(page.getByText(/Previous-session baseline: \d+ of 60 stored sessions/)).toBeVisible();
  await expect(page.getByText("Sectors /v2/broker-summary/")).toBeVisible();
});

test("opens a relative-volume measurement with its 20 prior days", async ({ page }) => {
  await page.goto("/happening");
  await page
    .getByRole("region", { name: "Filter records" })
    .getByRole("button", { name: "market", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Baseline inputs" })).toBeVisible();
  await expect(page.getByText("20 of 20 prior stored trading days")).toBeVisible();
  await expect(
    page
      .locator(".today-detail-section")
      .filter({ hasText: "Baseline inputs" })
      .locator("tbody tr"),
  ).toHaveCount(20);
  await page.getByRole("link", { name: "Open full company record" }).click();
  await expect(page.getByRole("heading", { name: "Market context" })).toBeVisible();
});

test("opens matched news without adding an interpretation", async ({ page }) => {
  await page.goto("/happening");
  await page
    .getByRole("region", { name: "Filter records" })
    .getByRole("button", { name: "news", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Entity matches" })).toBeVisible();
  await expect(page.getByText("Rule: exact ticker in the Sectors `symbols` field.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open source article" })).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  const firstTicker = (
    await page
      .locator(".today-detail-section")
      .filter({ hasText: "Entity matches" })
      .getByRole("link")
      .first()
      .innerText()
  ).split(" ")[0];
  await page.getByRole("link", { name: "Open Empire context" }).click();
  await expect(page.getByRole("button", { name: new RegExp(`^${firstTicker} `) })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("link", { name: "Return to record" }).click();
  await expect(page.getByRole("heading", { name: "Entity matches" })).toBeVisible();
  await page.getByRole("link", { name: "Open Empire context" }).click();
  await page.getByRole("link", { name: "Open company intelligence" }).click();
  await expect(page.getByRole("heading", { name: "Company news" })).toBeVisible();
});
