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
  await page.getByRole("tab", { name: "Listed companies that own others" }).click();
  await expect.poll(() => rows.count()).toBeGreaterThan(50);
  await expect(page.getByRole("cell", { name: "Not listed", exact: true })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Pooled holders", exact: true })).toHaveCount(0);
});

test("links Astra's company, holdings and shareholders through tables and the network", async ({
  page,
}) => {
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
  await expect(page.getByRole("heading", { name: "Who owns ASII" })).toBeVisible();
  await expect(page.locator(".owners-upstream a").first()).toHaveAttribute("href", /^\/owner\//);
  const coHolders = page.locator(".owners-holdings details").first();
  await coHolders.locator("summary").click();
  await expect(coHolders.getByRole("link").first()).toBeVisible();
  const network = page.getByRole("region", {
    name: "What PT Astra International Tbk owns",
    exact: true,
  });
  await expect(network).toBeVisible();
  await expect(network.locator('a[href="/company/ASII"]')).toContainText("ASII");
  await expect(network.locator('a[href="/company/UNTR"]')).toContainText("59.50%");
  await expect(network.locator('a[href="/company/AALI"]')).toContainText("79.68%");
  await expect(network.locator('a[href="/owner/jardine%20cycle%20carriage"]')).toContainText(
    "50.11%",
  );
  await expect(page.locator(".owners-holdings").getByRole("columnheader")).toHaveText([
    "Company",
    "Stake",
    "Value",
    "Other shareholders",
  ]);
  await page.evaluate(() => {
    (window as unknown as { networkNavigationMarker: string }).networkNavigationMarker = "retained";
  });
  await network.locator('a[href="/company/UNTR"]').click();
  await expect(page).toHaveURL(/\/company\/UNTR$/);
  expect(
    await page.evaluate(
      () => (window as unknown as { networkNavigationMarker: string }).networkNavigationMarker,
    ),
  ).toBe("retained");
});

test("merges Edwin's reviewed spelling and exposes ADRO's reported name", async ({ page }) => {
  await page.goto("/owner/edwin%20soeryadjaya");
  await expect(page.getByRole("heading", { name: "Edwin Soeryadjaya", exact: true })).toBeVisible();
  const rows = page.locator(".owners-holdings tbody tr");
  await expect(rows).toHaveCount(4);
  for (const symbol of ["ADRO", "MPMX", "SRTG", "TBIG"]) {
    await expect(
      page
        .locator(`.owners-holdings tr[data-symbol="${symbol}"]`)
        .getByRole("link", { name: symbol, exact: true }),
    ).toHaveAttribute("href", `/company/${symbol}`);
  }
  await expect(
    page
      .locator('.owners-holdings tr[data-symbol="ADRO"]')
      .getByText("Named as Edwin Soeryadjaja", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.owners-holdings tr[data-symbol="MPMX"]')).not.toContainText(
    "Named as",
  );
});

test("lists group members with measurements and a network of shared shareholders", async ({
  page,
}) => {
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
  await expect(
    page.getByText(
      "Business groups as our data provider labels them. Being in a group doesn’t prove who controls a company, and a company can sit in more than one group.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Cash conversion", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('.owners-members tr[data-symbol="ICBP"]')
      .getByRole("cell", { name: "1.59×", exact: true }),
  ).toBeVisible();
  const network = page.getByRole("region", { name: "Companies in the Salim group", exact: true });
  await expect(network).toBeVisible();
  await expect(network.locator('a[href="/company/INDF"]')).toContainText("INDF");
  await expect(network.locator('a[href="/company/ICBP"]')).toContainText("ICBP");
  await expect(
    network
      .locator(".network-edge-cross title")
      .getByText("Indofood Sukses Makmur Tbk owns 80.53% of Indofood CBP Sukses Makmur Tbk", {
        exact: true,
      }),
  ).toHaveCount(1);
});

test("contains tables and the scrollable network at 390 pixels", async ({ page }) => {
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
      const network = page.getByRole("region", {
        name: "What PT Astra International Tbk owns",
        exact: true,
      });
      await expect(network).toBeVisible();
      await expect(network).toHaveAttribute("tabindex", "0");
      await expect(network.locator('a[href="/company/ASII"]')).toContainText("ASII");
      await expect(network.locator('a[href="/company/AALI"]')).toContainText("79.68%");
      const widths = await network.evaluate((element) => ({
        drawing: element.scrollWidth,
        container: element.clientWidth,
      }));
      expect(widths.drawing).toBeGreaterThan(widths.container);
    }
  }
});

test("caps Bank of Singapore's nine downstream companies and identifies its account role", async ({
  page,
}) => {
  await page.goto("/owner/bank%20of%20singapore");
  await expect(
    page.getByRole("heading", { name: "Bank Of Singapore Limited", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Custodian or nominee account", { exact: true })).toBeVisible();
  await expect(page.getByText(/may hold shares for clients/)).toBeVisible();
  const network = page.getByRole("region", {
    name: "What Bank Of Singapore Limited owns",
    exact: true,
  });
  await expect(network.locator(".network-ring-1.network-listed")).toHaveCount(8);
  const more = network.locator('a[href="#owner-holdings"]');
  await expect(more).toHaveAccessibleName("1 more");
  await expect(more.locator("tspan")).toHaveText("+1 more");
  await more.click();
  await expect(page).toHaveURL(/#owner-holdings$/);
  await expect(page.locator(".owners-holdings tbody tr")).toHaveCount(9);
  await page.goto("/owners");
  await page.getByLabel("Search owners").fill("Bank Of Singapore");
  await expect(page.getByText("Custodian or nominee account", { exact: true })).toBeVisible();
  await page.goto("/company/DMMX");
  const holder = page
    .locator(".profile-holdings tr")
    .filter({ has: page.getByRole("link", { name: "Bank Of Singapore Limited", exact: true }) });
  await expect(holder.getByText("Custodian or nominee account", { exact: true })).toBeVisible();
});
