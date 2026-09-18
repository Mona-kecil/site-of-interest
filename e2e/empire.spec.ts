import { expect, test } from "@playwright/test";

test("moves from the Empire graph into company intelligence", async ({ page }) => {
  await page.goto("/empire/prajogo");

  await expect(page.getByRole("heading", { level: 1, name: "Prajogo Pangestu" })).toBeVisible();
  await expect(page.getByText("39 entities")).toBeVisible();
  await expect(page.getByText("21 Sectors sources")).toBeVisible();

  await page.getByRole("button", { name: "Trace SINI" }).click();
  await expect(page.getByRole("button", { name: /^SINI / })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("PT Singaraja Putra Tbk").last()).toBeVisible();

  await page.getByRole("link", { name: "Open company intelligence" }).click();
  await expect(page).toHaveURL(/\/company\/SINI$/);
  await expect(page.getByRole("heading", { level: 1, name: "SINI" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recovery priced ahead" })).toBeVisible();
  await expect(page.getByText("Rp17.41tn")).toBeVisible();

  await page.getByRole("link", { name: "Prajogo Empire" }).click();

  await page.getByRole("button", { name: "All owners" }).click();
  await expect(page.getByRole("button", { name: /Scg Chemicals/ })).toBeVisible();
});

test("presents authenticated Sectors evidence without a dead browser link", async ({ page }) => {
  await page.goto("/company/CUAN");

  await expect(page.getByText("Authenticated API", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("/v2/company/report/CUAN/", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "CUAN company report" })).toHaveCount(0);
});
