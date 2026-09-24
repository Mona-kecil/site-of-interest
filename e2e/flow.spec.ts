import { expect, test } from "@playwright/test";

for (const ticker of ["CUAN", "PTRO"]) {
  test(`opens stored Flow for ${ticker} and retains a selected broker day`, async ({ page }) => {
    await page.goto(`/empire/prajogo/company/${ticker}`);
    await page.getByRole("link", { name: `Open Flow for ${ticker}` }).click();
    await expect(page).toHaveURL(new RegExp(`/flow/${ticker}\\?empireSlug=prajogo$`));
    await expect(page.getByRole("heading", { level: 1, name: `${ticker} Flow` })).toBeVisible();
    await expect(page.getByRole("button", { name: /Load completed window/ })).toBeVisible();

    const date = await page
      .locator(".flow-daily-table tbody tr")
      .filter({ hasText: "Market + broker" })
      .first()
      .getByRole("button")
      .innerText();
    await page.getByRole("button", { name: date, exact: true }).click();
    await expect(page.getByRole("heading", { name: `Broker activity · ${date}` })).toBeVisible();
    expect(await page.locator(".flow-broker-table tbody tr").count()).toBeGreaterThan(0);
    await expect(page.locator(".flow-source").nth(1).locator("code")).toContainText(
      `/v2/broker-summary/${ticker}/`,
    );

    await page.reload();
    await page.getByRole("button", { name: date, exact: true }).click();
    await expect(page.locator(".flow-broker-table tbody tr").first()).toBeVisible();
  });
}

test("Flow keeps the document within a 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/flow/CUAN?empireSlug=prajogo");
  await expect(page.getByRole("heading", { level: 1, name: "CUAN Flow" })).toBeVisible();
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
});
