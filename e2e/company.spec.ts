import { expect, test } from "@playwright/test";

test("opens a lowercase bank symbol with NPL and no ROIC", async ({ page }) => {
  await page.goto("/company/bbca");
  await expect(page.getByRole("heading", { name: "Banks", exact: true })).toBeVisible();
  const npl = page.locator('[data-check="npl_ratio"]');
  await expect(npl.locator(".profile-check-value > strong")).toHaveText("1.65%");
  await expect(page.locator('[data-check="roic"]')).toHaveCount(0);
  const verdict = page.getByRole("region", { name: "Worth a look", exact: true });
  await expect(verdict).toBeVisible();
  await expect(verdict).toContainText("Cash: Not checked");
  await expect(verdict).toContainText("Loans and capital look sound");
  await expect(verdict).toContainText("NPL ratio 1.65% · passes at 3% or less");
  await expect(verdict.getByRole("link", { name: "See balance sheet details" })).toHaveAttribute(
    "href",
    "#profile-banks",
  );
});

test("explains the pillars that keep companies with gaps Mixed", async ({ page }) => {
  for (const [symbol, description] of [
    [
      "AADI",
      "No flags, but Cash, Price and Owners fall short of a pass. Worth a look needs cash and the balance sheet to pass.",
    ],
    ["POWR", "No flags, but Price and Owners fall short of a pass. Worth a look allows only one."],
    [
      "TOTL",
      "No flags, but Balance sheet and Price fall short of a pass. Worth a look needs cash and the balance sheet to pass.",
    ],
    ["YUPI", "No flags, but Price and Owners fall short of a pass. Worth a look allows only one."],
  ]) {
    await page.goto(`/company/${symbol}`);
    const verdict = page.getByRole("region", { name: "Mixed", exact: true });
    await expect(verdict.locator(".verdict-head p")).toHaveText(description);
    await expect(verdict).toContainText("Nothing flagged, but some figures are missing");
    if (symbol === "AADI") {
      const cash = verdict.locator(".idea-reason").filter({ hasText: "Cash: Partly passes" });
      await expect(cash.locator("li")).toHaveText([
        "FCF yield 10.31% · passes above 0%",
        "Cash conversion: No data",
      ]);
    }
  }
});

test("explains a company price flag before the section navigation", async ({ page }) => {
  await page.goto("/company/DCII");
  const verdict = page.getByRole("region", { name: "Red flags", exact: true });
  await expect(verdict).toBeVisible();
  await expect(verdict).toContainText("Price: Flagged");
  await expect(verdict).toContainText("Priced for perfection");
  await expect(verdict).toContainText("Current P/E 413.61× · flagged above 50");
  await verdict.getByRole("link", { name: "See price details" }).click();
  await expect(page).toHaveURL(/#profile-price$/);
});

test("opens cash conversion with its plain calculation, inputs and source date", async ({
  page,
}) => {
  await page.goto("/company/ASII");
  const cash = page.locator('[data-check="cash_conversion"]');
  await expect(cash.getByRole("heading", { name: "Cash conversion", exact: true })).toBeVisible();
  await expect(cash.locator(".profile-check-rank")).toHaveText(
    "Ranks 2nd of 3 companies in Multi-sector Holdings with data.",
  );
  await cash.getByText("How it’s calculated", { exact: true }).click();
  await expect(
    cash.getByText(
      "Operating cash flow divided by earnings, each added up over three years. Above 1× means more cash came in than profit was booked.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(cash.locator(".check-calculation dt")).toHaveText([
    "Operating cash flow, 2023",
    "Operating cash flow, 2024",
    "Operating cash flow, 2025",
    "Earnings, 2023",
    "Earnings, 2024",
    "Earnings, 2025",
  ]);
  await expect(cash.locator(".check-calculation dd")).toHaveText([
    "IDR 33,746.00 bn",
    "IDR 45,029.00 bn",
    "IDR 44,694.00 bn",
    "IDR 33,839.00 bn",
    "IDR 34,051.00 bn",
    "IDR 32,769.00 bn",
  ]);
  await expect(
    cash.getByText("Source: Sectors, retrieved 2 Oct 2026.", { exact: true }),
  ).toBeVisible();
});

test("renders an unknown symbol with a return link", async ({ page }) => {
  await page.goto("/company/ZZZZ");
  await expect(page.getByRole("heading", { name: "Company not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Screener" })).toHaveAttribute(
    "href",
    "/universe",
  );
});

test("contains tables and expanded calculations at 390 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const symbol of ["ASII", "BBCA", "GOTO"]) {
    await page.goto(`/company/${symbol}`);
    await expect(page.locator(".profile-symbol")).toHaveText(symbol);
    await page.locator(".profile-evidence > summary").first().click();
    await expect(page.locator(".profile-evidence[open] .check-calculation")).toBeVisible();
    await expect(page.locator(".profile-evidence[open] .check-source")).toHaveText(
      "Source: Sectors, retrieved 2 Oct 2026.",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    const table = page.locator(".profile-table-wrap").first();
    const widths = await table.evaluate((element) => ({
      table: element.scrollWidth,
      container: element.clientWidth,
    }));
    expect(widths.table).toBeGreaterThan(widths.container);
  }
});

test("opens a company from its screener symbol and check panel", async ({ page }) => {
  await page.goto("/universe");
  await page.getByLabel("Search companies").fill("ASII");
  await page.evaluate(() => {
    (window as unknown as { researchNavigationMarker: string }).researchNavigationMarker =
      "retained";
  });
  await page.getByRole("link", { name: "ASII", exact: true }).click();
  await expect(page).toHaveURL(/\/company\/ASII$/);
  await expect(page.locator('[data-check="cash_conversion"]')).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { researchNavigationMarker: string }).researchNavigationMarker,
    ),
  ).toBe("retained");
  await page.goto("/universe");
  await page.getByRole("button", { name: "ASII Cash conversion", exact: true }).click();
  await page.getByRole("link", { name: "ASII company page →", exact: true }).click();
  await expect(page).toHaveURL(/\/company\/ASII$/);
});

test("links an entity holder to its owner page", async ({ page }) => {
  await page.goto("/company/AALI");
  await page
    .getByRole("region", { name: "Shareholders", exact: true })
    .getByRole("link", { name: "PT Astra International Tbk", exact: true })
    .click();
  await expect(page).toHaveURL(/\/owner\/astra%20international$/);
  await expect(page.getByRole("link", { name: /ASII company page/ })).toBeVisible();
});

test("displays AALI dividends in IDR per share", async ({ page }) => {
  await page.goto("/company/AALI");
  const history = page.getByRole("region", { name: "Price against own history, yearly figures" });
  await expect(
    history.getByRole("columnheader", { name: "Dividend per share", exact: true }),
  ).toBeVisible();
  for (const value of [91, 255, 444, 401, 249, 184])
    await expect(
      history.getByRole("cell", { name: `IDR ${value}.00 per share`, exact: true }),
    ).toBeVisible();
  const check = page.locator('[data-check="dividend_years"]');
  await check.getByText("How it’s calculated", { exact: true }).click();
  await expect(
    check.getByText("How many of the last six years had a dividend.", { exact: true }),
  ).toBeVisible();
  await expect(check.getByText("Dividend per share, 2025", { exact: true })).toBeVisible();
  await expect(check.getByText("IDR 184.00 per share", { exact: true })).toBeVisible();
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
  const holder = page.getByRole("link", {
    name: "PT Indomobil Sukses International Tbk",
    exact: true,
  });
  await expect(holder).toHaveAttribute("href", "/owner/indomobil%20sukses%20internasional");
  await holder.click();
  await expect(page).toHaveURL(/\/owner\/indomobil%20sukses%20internasional$/);
  const company = page.getByRole("link", { name: "IMAS company page →", exact: true });
  await expect(company).toHaveAttribute("href", "/company/IMAS");
  await company.click();
  await expect(page).toHaveURL(/\/company\/IMAS$/);
});
