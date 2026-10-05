import { expect, test } from "@playwright/test";

test.describe("a first visit", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("invites the visitor and walks the six stops", async ({ page }) => {
    await page.goto("/");
    const invite = page.getByRole("region", { name: "Take a two-minute tour" });
    await invite.getByRole("button", { name: "Start the tour" }).click();
    const card = page.getByRole("dialog");
    const stops: [RegExp, string, string][] = [
      [/\/$/, "Five questions for every company", "Next: Ideas"],
      [/\/ideas$/, "The shortlist", "Next: A company"],
      [/\/company\/TLKM$/, "Every verdict shows its work", "Next: Its track record"],
      [/\/company\/TLKM$/, "The same rules, year by year", "Next: The screener"],
      [/\/universe$/, "All 962 companies, every number", "Next: Who owns what"],
      [/\/owner\/dwimuria%20investama%20andalan$/, "Follow the owners", "Finish"],
    ];
    for (const [at, [url, title, next]] of stops.entries()) {
      await expect(page).toHaveURL(url);
      await expect(card).toHaveAccessibleName(title);
      await expect(card).toContainText(`Tour · ${at + 1} of 6`);
      await expect(page.locator(".tour-ring")).toBeVisible();
      await card.getByRole("button", { name: next }).click();
    }
    await expect(card).toHaveCount(0);

    await page.reload();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Take the tour" }),
    ).toBeVisible();
    await expect(invite).toHaveCount(0);
  });
});

test("starts at the visitor's page, waits for them and ends on Escape", async ({ page }) => {
  await page.goto("/universe");
  const opener = page.getByRole("banner").getByRole("button", { name: "Take the tour" });
  await opener.click();
  const card = page.getByRole("dialog", {
    name: "All 962 companies, every number",
  });
  await expect(card).toContainText("Tour · 5 of 6");

  await page.getByRole("link", { name: "Ideas", exact: true }).first().click();
  await expect(page).toHaveURL(/\/ideas$/);
  await expect(page.locator(".tour-ring")).toBeHidden();
  await card.getByRole("button", { name: "Back to the tour" }).click();
  await expect(page).toHaveURL(/\/universe$/);
  await expect(page.locator(".tour-ring")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("keeps the data date on phones and offers the tour in the footer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/universe");
  await expect(page.getByRole("banner").getByText(/^Sectors data · /)).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Take the tour" }),
  ).toBeHidden();
  await page.getByRole("contentinfo").getByRole("button", { name: "Take the tour" }).click();
  await expect(page.getByRole("dialog")).toContainText("Tour · 5 of 6");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
