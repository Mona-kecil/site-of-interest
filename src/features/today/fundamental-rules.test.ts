import { describe, expect, it } from "vitest";
import { buildFundamentalSignals, sectorTemplateFor } from "./fundamental-rules";

type Facts = Parameters<typeof buildFundamentalSignals>[0]["facts"];

function annual(
  year: number,
  overrides: Partial<Extract<Facts[number], { kind: "financial_year" }>> = {},
): Facts[number] {
  return {
    id: `x-${year}`,
    entityId: "x",
    kind: "financial_year",
    year,
    asOf: `${year}-12-31`,
    context: "test",
    revenue: 100,
    earnings: 20,
    operatingCashFlow: 30,
    freeCashFlow: 10,
    totalAssets: 200,
    totalDebt: 40,
    unit: "IDR",
    sourceRefs: [{ sourceId: "report-x", locator: `financials[year=${year}]` }],
    ...overrides,
  };
}

function build(
  facts: Facts,
  summary = "Chemicals · Basic Materials. Company records returned by Sectors.",
) {
  return buildFundamentalSignals({
    empireSlug: "prajogo",
    entityId: "x",
    ticker: "XXXX",
    companyName: "Example",
    summary,
    facts,
  });
}

describe("fundamental rule registry", () => {
  it("applies a versioned year-over-year formula to exact source fields", () => {
    const signals = build([annual(2024), annual(2025, { revenue: 125 })]);
    const revenue = signals.find(
      (signal) => signal.metricId === "revenue_yoy" && signal.period === "FY2025",
    );
    expect(revenue).toMatchObject({ value: 25, unit: "%", ruleVersion: "v1", gap: null });
    expect(revenue?.inputs.map((item) => item.sourceRefs[0].locator)).toEqual([
      "financials[year=2025].revenue",
      "financials[year=2024].revenue",
    ]);
    expect(build([annual(2024), annual(2025, { revenue: 125 })])).toEqual(signals);
  });

  it("stores gaps for absent prior years, missing debt, and zero denominators", () => {
    const signals = build([annual(2023), annual(2025, { earnings: 0, totalDebt: undefined })]);
    expect(
      signals.find((item) => item.metricId === "revenue_yoy" && item.period === "FY2023")?.gap,
    ).toBe("Prior annual record unavailable");
    expect(
      signals.find((item) => item.metricId === "revenue_yoy" && item.period === "FY2025")?.gap,
    ).toBe("Prior fiscal year unavailable");
    expect(
      signals.find((item) => item.metricId === "cash_conversion" && item.period === "FY2025")
        ?.value,
    ).toBeNull();
    expect(
      signals.find((item) => item.metricId === "debt_assets" && item.period === "FY2025")?.gap,
    ).toBe("Required input unavailable");
  });

  it("excludes debt-to-assets from a financial-sector template", () => {
    expect(sectorTemplateFor("Banking · Financials. Company records returned by Sectors.")).toBe(
      "financial",
    );
    const signals = build(
      [annual(2024)],
      "Banking · Financials. Company records returned by Sectors.",
    );
    expect(signals.some((item) => item.metricId === "debt_assets")).toBe(false);
    expect(signals.some((item) => item.metricId === "return_assets")).toBe(true);
  });

  it("does not assign a rule template to an unknown sector", () => {
    expect(sectorTemplateFor("Example · Unclassified. Company records returned by Sectors.")).toBe(
      "unknown",
    );
    expect(
      build([annual(2024)], "Example · Unclassified. Company records returned by Sectors."),
    ).toEqual([]);
  });

  it("keeps reported P/E separate from an undefined provider peer set", () => {
    const signals = build([
      {
        id: "pe-2025",
        entityId: "x",
        kind: "valuation_period",
        year: 2025,
        asOf: "2026-09-17",
        context: "test",
        pe: 12.5,
        peerPe: 18,
        sourceRefs: [{ sourceId: "report-x", locator: "valuation.pe" }],
      },
    ]);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      metricId: "reported_pe",
      value: 12.5,
      ruleVersion: "provider-value.v1",
      period: "2025",
    });
  });
});
