import { describe, expect, it } from "vitest";
import {
  annualPeriods,
  assembleSections,
  extractSeries,
  formatIdr,
  formatIdrAmount,
  orderHoldings,
  peerStrip,
  quarterFields,
  quarterPeriods,
} from "./profile-model";

describe("Company profile model", () => {
  it("keeps reported zeros, null inputs and absent annual rows in their period slots", () => {
    const fields = assembleSections({ subSector: "Industrial Goods" }).sections[0].series;
    const series = extractSeries(
      [
        { year: 2020, values: { earnings: 0, operatingCashFlow: 20, freeCashFlow: null } },
        { year: 2022, values: { earnings: -4, operatingCashFlow: null, freeCashFlow: 3 } },
      ],
      annualPeriods,
      fields,
    );
    expect(series.map(({ period }) => period)).toEqual([2019, 2020, 2021, 2022, 2023, 2024, 2025]);
    expect(series[0].values).toEqual([null, null, null, null]);
    expect(series[1].values).toEqual([0, 20, null, null]);
    expect(series[2].values).toEqual([null, null, null, null]);
    expect(series[3].values).toEqual([-4, null, 3, null]);
  });

  it("keeps all eight quarter slots in chronological order", () => {
    const series = extractSeries(
      [{ quarter: "Q1-2025", values: { revenueQ: 10, earningsQ: 0 } }],
      quarterPeriods,
      quarterFields,
    );
    expect(series).toHaveLength(8);
    expect(series[0]).toEqual({ period: "Q3-2024", values: [null, null, null, null] });
    expect(series[2]).toEqual({ period: "Q1-2025", values: [10, 0, null, null] });
    expect(series.at(-1)?.period).toBe("Q2-2026");
  });

  it("assembles a bank's sections without non-financial checks", () => {
    const { sections, note } = assembleSections({ subSector: "Banks" });
    const ids = sections.flatMap(({ checks }) => checks.map(({ id }) => id));
    expect(sections.map(({ label }) => label)).toEqual([
      "Returns",
      "Balance sheet",
      "Price against own history",
      "Owners",
      "Banks",
    ]);
    expect(ids).toContain("npl_ratio");
    expect(ids).not.toContain("roic");
    expect(ids).not.toContain("cash_conversion");
    expect(note).toBeNull();
  });

  it("uses the screener lens order for a non-financial and excludes bank checks", () => {
    const { sections, note } = assembleSections({ subSector: "Multi-sector Holdings" });
    expect(sections.map(({ label }) => label)).toEqual([
      "Cash",
      "Returns",
      "Balance sheet",
      "Price against own history",
      "Owners",
    ]);
    expect(sections.flatMap(({ checks }) => checks.map(({ id }) => id))).toContain("roic");
    expect(sections.flatMap(({ checks }) => checks.map(({ id }) => id))).not.toContain("npl_ratio");
    expect(note).toBeNull();
  });

  it("explains non-applicability for an insurer while retaining checks that apply to all", () => {
    const { sections, note } = assembleSections({ subSector: "Insurance" });
    expect(note).toBe("Non-financial checks do not apply to its sub-sector (Insurance).");
    const ids = sections.flatMap(({ checks }) => checks.map(({ id }) => id));
    expect(ids).toContain("roe");
    expect(ids).not.toContain("roic");
    expect(ids).not.toContain("npl_ratio");
  });

  it("positions peer values on a linear axis, shares tie positions and retains missing peers", () => {
    const strip = peerStrip(
      [
        { symbol: "A", value: -2 },
        { symbol: "B", value: 0 },
        { symbol: "C", value: 0 },
        { symbol: "D", value: 6 },
        { symbol: "E", value: null },
      ],
      "C",
    );
    expect(strip.points.map(({ position }) => position)).toEqual([0, 0.25, 0.25, 1]);
    expect(strip.points.filter(({ selected }) => selected).map(({ symbol }) => symbol)).toEqual([
      "C",
    ]);
    expect(strip.missing).toEqual(["E"]);
    expect([strip.min, strip.max]).toEqual([-2, 6]);
  });

  it("centers a single peer and all-equal peers and leaves an empty axis unreported", () => {
    expect(peerStrip([{ symbol: "A", value: 8 }], "A").points[0].position).toBe(0.5);
    expect(
      peerStrip(
        [
          { symbol: "A", value: 8 },
          { symbol: "B", value: 8 },
        ],
        "A",
      ).points.map(({ position }) => position),
    ).toEqual([0.5, 0.5]);
    expect(peerStrip([{ symbol: "A", value: null }], "A")).toEqual({
      min: null,
      max: null,
      points: [],
      missing: ["A"],
    });
  });

  it("formats IDR with an explicit, consistent billion or trillion unit", () => {
    expect(formatIdr(1.25e12)).toBe("IDR 1,250.00 bn");
    expect(formatIdr(1.25e12, "tn")).toBe("IDR 1.25 tn");
    expect(formatIdr(-2.5e9)).toBe("IDR -2.50 bn");
    expect(formatIdr(0)).toBe("IDR 0.00 bn");
    expect(formatIdr(null)).toBe("Not reported");
    expect(formatIdrAmount(null)).toBe("Not reported");
  });

  it("orders entities by percentage, then public, then treasury, without mutating rows", () => {
    const holdings = [
      { holderKind: "treasury", holderName: "Treasury", percentage: 0.3 },
      { holderKind: "entity", holderName: "Unreported", percentage: null },
      { holderKind: "public", holderName: "Public", percentage: 0.8 },
      { holderKind: "entity", holderName: "Small holder", percentage: 0.01 },
      { holderKind: "entity", holderName: "Controller", percentage: 0.5 },
    ] as const;
    expect(orderHoldings(holdings).map(({ holderName }) => holderName)).toEqual([
      "Controller",
      "Small holder",
      "Unreported",
      "Public",
      "Treasury",
    ]);
    expect(holdings[0].holderName).toBe("Treasury");
  });
});
