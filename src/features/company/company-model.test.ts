import { describe, expect, it } from "vitest";
import { deriveAnnualComparisons, formatCompanyValue } from "./company-model";

const sourceRefs = [{ sourceId: "report", locator: "financials.historical_financials" }];

describe("company measurements", () => {
  it("compares annual values and keeps both source periods", () => {
    const comparisons = deriveAnnualComparisons([
      {
        year: 2024,
        revenue: 100,
        earnings: -20,
        operatingCashFlow: 12,
        freeCashFlow: -4,
        unit: "IDR",
        sourceRefs,
      },
      {
        year: 2025,
        revenue: 125,
        earnings: 10,
        operatingCashFlow: 15,
        freeCashFlow: 0,
        totalDebt: 50,
        unit: "IDR",
        sourceRefs,
      },
    ]);

    expect(comparisons.find(({ metric }) => metric === "revenue")).toMatchObject({
      currentYear: 2025,
      previousYear: 2024,
      change: 25,
      changePercent: 25,
      sourceRefs: [sourceRefs[0], sourceRefs[0]],
    });
    expect(comparisons.find(({ metric }) => metric === "earnings")?.changePercent).toBe(150);
    expect(comparisons.find(({ metric }) => metric === "totalDebt")).toMatchObject({
      previous: null,
      change: null,
      changePercent: null,
    });
  });

  it("leaves percentage change unavailable when the baseline is zero", () => {
    const comparisons = deriveAnnualComparisons([
      {
        year: 2024,
        revenue: 0,
        earnings: 0,
        operatingCashFlow: 0,
        freeCashFlow: 0,
        unit: "IDR",
        sourceRefs,
      },
      {
        year: 2025,
        revenue: 10,
        earnings: 0,
        operatingCashFlow: 0,
        freeCashFlow: 0,
        unit: "IDR",
        sourceRefs,
      },
    ]);

    expect(comparisons[0]).toMatchObject({ change: 10, changePercent: null });
    expect(deriveAnnualComparisons([])).toEqual([]);
  });

  it("formats market values without losing their sign", () => {
    expect(formatCompanyValue(17_406_187_500_000, "IDR")).toBe("Rp17.41tn");
    expect(formatCompanyValue(-43_087_994_671, "IDR")).toBe("−Rp43.09bn");
    expect(formatCompanyValue(46.6259, "percent")).toBe("46.63%");
  });
});
