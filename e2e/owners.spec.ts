import { expect, test } from "@playwright/test";

test("indexes owners, merges Danantara, and exposes the listed-owner view", async ({ page }) => {
  await page.goto("/owners");
  await expect(page.getByRole("heading", { name: "Owners", exact: true })).toBeVisible();
  const rows = page.locator(".owners-table tbody tr");
  await expect.poll(() => rows.count()).toBeGreaterThan(1000);
  await page.getByLabel("Search owners").fill("danantara");
  await expect(rows).toHaveCount(1);
  expect(Number(await rows.first().getAttribute("data-company-count"))).toBeGreaterThanOrEqual(9);
  await expect(rows.first()).toHaveAttribute("data-owner-key", "danantara asset management");
  await rows.first().getByRole("link").click();
  await expect(page).toHaveURL(/\/owner\/danantara(?:%20| )asset(?:%20| )management$/);
  await expect
    .poll(() => page.locator(".owners-holdings tbody tr").count())
    .toBeGreaterThanOrEqual(9);
  await page.goto("/owners");
  await page.getByRole("tab", { name: "Listed companies that own listed companies" }).click();
  await expect.poll(() => rows.count()).toBeGreaterThan(50);
  await expect(page.getByRole("cell", { name: "Holder", exact: true })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Bucket label", exact: true })).toHaveCount(0);
});

test("links Astra's company, holdings, co-holders and upstream chain", async ({ page }) => {
  await page.goto("/owner/astra%20international");
  await expect(page.getByRole("heading", { name: /^PT Astra International/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "ASII company page →" })).toHaveAttribute(
    "href",
    "/company/ASII",
  );
  await expect
    .poll(() => page.locator(".owners-holdings tbody tr").count())
    .toBeGreaterThanOrEqual(5);
  await expect(page.locator('.owners-holdings a[href="/company/UNTR"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Holders of ASII" })).toBeVisible();
  await expect(page.locator(".owners-upstream a").first()).toHaveAttribute("href", /^\/owner\//);
  const coHolders = page.locator(".owners-holdings details").first();
  await coHolders.locator("summary").click();
  await expect(coHolders.getByRole("link").first()).toBeVisible();
  await expect(page.getByRole("img", { name: /^Reported ownership links/ })).toBeVisible();
});

test("lists Sectors business-group members with check summaries", async ({ page }) => {
  await page.goto("/groups");
  await expect
    .poll(() => page.locator(".owners-groups tbody tr").count())
    .toBeGreaterThanOrEqual(24);
  await page.getByRole("link", { name: "Salim", exact: true }).click();
  await expect(page).toHaveURL(/\/group\/salim$/);
  await expect(page.getByRole("heading", { name: "Salim", exact: true })).toBeVisible();
  await expect
    .poll(() => page.locator(".owners-members tbody tr").count())
    .toBeGreaterThanOrEqual(15);
  await expect(page.getByText(/control has not been verified/)).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Cash conversion", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".owners-members tbody small").filter({ hasText: /peers/ }).first(),
  ).toBeVisible();
});

test("contains tables and the graph at 390 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/owners", "/owner/astra%20international", "/groups", "/group/salim"]) {
    await page.goto(path);
    await expect.poll(() => page.locator(".owners-table tbody tr").count()).toBeGreaterThan(0);
    const widths = await page.evaluate(() => {
      const table = document.querySelector(".owners-table-wrap")!;
      return {
        page: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        table: table.scrollWidth,
        container: table.clientWidth,
      };
    });
    expect(widths.page).toBeLessThanOrEqual(widths.viewport);
    expect(widths.table).toBeGreaterThan(widths.container);
    if (path.startsWith("/owner/")) {
      await page.locator(".owners-holdings summary").first().click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390,
      );
      const graph = await page
        .locator(".owners-graph-scroll")
        .evaluate((element) => ({ content: element.scrollWidth, width: element.clientWidth }));
      expect(graph.content).toBeGreaterThan(graph.width);
    }
  }
});


test("caps Bank of Singapore's nine downstream companies and identifies its account role", async ({ page }) => {
  await page.goto("/owner/bank%20of%20singapore");
  await expect(page.getByRole("heading", { name: "Bank Of Singapore Limited", exact: true })).toBeVisible();
  await expect(page.getByText("Custodian or nominee account", { exact: true })).toBeVisible();
  await expect(page.getByText(/may hold shares for clients/)).toBeVisible();
  await expect(page.locator(".owners-node-company")).toHaveCount(8);
  const more = page.locator('.owners-graph a[href="#owner-holdings"]');
  await expect(more).toHaveAccessibleName("+1 more");
  await more.click();
  await expect(page).toHaveURL(/#owner-holdings$/);
  await expect(page.locator(".owners-holdings tbody tr")).toHaveCount(9);
  await page.goto("/owners");
  await page.getByLabel("Search owners").fill("Bank Of Singapore");
  await expect(page.getByText("Custodian or nominee account", { exact: true })).toBeVisible();
  await page.goto("/company/DMMX");
  const holder = page.locator(".profile-holdings tr").filter({ has: page.getByRole("link", { name: "Bank Of Singapore Limited", exact: true }) });
  await expect(holder.getByText("Custodian or nominee account", { exact: true })).toBeVisible();
});
