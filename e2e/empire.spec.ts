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
