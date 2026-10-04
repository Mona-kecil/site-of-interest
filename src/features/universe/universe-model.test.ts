import { describe, expect, it } from "vitest";
import { formatInput, formatPeers, formatValue } from "../../universe/presentation.mjs";
import {
  filterOptions,
  formatMarketCap,
  screenRows,
  UNREPORTED,
  type Filters,
  type ScreenRow,
} from "./universe-model";

const filters: Filters = { search: "", sector: "", subSector: "", index: "", verdict: "" };
function row(symbol: string, value: number | null, overrides: Partial<ScreenRow> = {}): ScreenRow {
  return {
    symbol,
    name: `${symbol} Company`,
    sector: "Financials",
    subSector: "Banks",
    indices: ["LQ45"],
    marketCap: value,
    freeFloat: null,
    peTtm: null,
    checks: [
      {
        checkId: "npl_ratio",
        value,
        percentile: null,
        peerCount: 4,
        gap: value === null ? "Not reported" : null,
      },
    ],
    ...overrides,
  };
}

describe("Universe measurements", () => {
  it("filters each verdict using the same assessment as the ideas and company pages", () => {
    const checks = Object.entries({
      cash_conversion: 1,
      roic: 0.15,
      net_debt_to_ebitda: 1,
      pe_vs_history: 0.8,
      free_float: 0.3,
    }).map(([checkId, value]) => ({ checkId, value, percentile: null, peerCount: 1, gap: null }));
    const idea = row("IDEA", 1, { subSector: "Industrials", checks, peTtm: 12 });
    const rows = [
      idea,
      { ...idea, symbol: "FLAG", peTtm: 100 },
      {
        ...idea,
        symbol: "MIXED",
        checks: checks.filter(({ checkId }) => checkId !== "cash_conversion"),
      },
      row("THIN", 1, { checks: [] }),
    ];
    for (const [verdict, symbol] of [
      ["idea", "IDEA"],
      ["flags", "FLAG"],
      ["mixed", "MIXED"],
      ["thin", "THIN"],
    ]) {
      expect(
        screenRows(rows, { ...filters, verdict }, { column: "symbol", direction: "asc" }).map(
          ({ symbol }) => symbol,
        ),
      ).toEqual([symbol]);
    }
  });
  it("combines search, sector, sub-sector and index without mutating rows", () => {
    const rows = [
      row("BBCA", 0.01, { name: "Bank Central Asia", indices: ["KOMPAS100", "LQ45"] }),
      row("ASII", 0.1, { sector: "Industrials", subSector: "Multi-sector Holdings" }),
    ];
    expect(
      screenRows(
        rows,
        {
          search: " CENTRAL ",
          sector: "Financials",
          subSector: "Banks",
          index: "KOMPAS100",
          verdict: "",
        },
        { column: "symbol", direction: "asc" },
      ).map(({ symbol }) => symbol),
    ).toEqual(["BBCA"]);
    expect(
      screenRows(rows, { ...filters, search: "asii" }, { column: "symbol", direction: "asc" }).map(
        ({ symbol }) => symbol,
      ),
    ).toEqual(["ASII"]);
    expect(rows[0].symbol).toBe("BBCA");
  });

  it("keeps zero values and sorts nulls and inapplicable checks last in both directions", () => {
    const rows = [
      row("MISS", null),
      row("ZERO", 0),
      row("HIGH", 0.3),
      row("OTHER", 0.2, { checks: [] }),
    ];
    for (const column of ["npl_ratio", "marketCap"]) {
      expect(
        screenRows(rows.slice(0, 3), filters, { column, direction: "asc" }).map(
          ({ symbol }) => symbol,
        ),
      ).toEqual(["ZERO", "HIGH", "MISS"]);
      expect(
        screenRows(rows.slice(0, 3), filters, { column, direction: "desc" }).map(
          ({ symbol }) => symbol,
        ),
      ).toEqual(["HIGH", "ZERO", "MISS"]);
    }
    expect(
      screenRows(rows, filters, { column: "npl_ratio", direction: "desc" }).map(
        ({ symbol }) => symbol,
      ),
    ).toEqual(["HIGH", "ZERO", "MISS", "OTHER"]);
  });

  it("sorts all text columns, puts unreported sub-sectors last and breaks ties by symbol", () => {
    const rows = [
      row("BBB", 1, { name: "Alpha", subSector: "Insurance" }),
      row("AAA", 1, { name: "Zulu", subSector: "Banks" }),
      row("CCC", 1, { subSector: null }),
    ];
    expect(screenRows(rows, filters, { column: "symbol", direction: "desc" })[0].symbol).toBe(
      "CCC",
    );
    expect(screenRows(rows, filters, { column: "name", direction: "asc" })[0].symbol).toBe("BBB");
    expect(
      screenRows(rows, filters, { column: "subSector", direction: "desc" }).map(
        ({ symbol }) => symbol,
      ),
    ).toEqual(["BBB", "AAA", "CCC"]);
    expect(
      screenRows(rows, filters, { column: "npl_ratio", direction: "desc" }).map(
        ({ symbol }) => symbol,
      ),
    ).toEqual(["AAA", "BBB", "CCC"]);
  });

  it("offers unreported values as a filter and preserves null lists", () => {
    const rows = [
      row("NULL", null, { sector: null, subSector: null, indices: null }),
      row("BANK", 1),
      row("EMPTY", 1, { indices: [] }),
    ];
    expect(filterOptions(rows, "indices")).toEqual([
      { value: "LQ45", label: "LQ45" },
      { value: UNREPORTED, label: "Not reported" },
    ]);
    expect(
      screenRows(
        rows,
        { ...filters, subSector: UNREPORTED },
        { column: "symbol", direction: "asc" },
      ).map(({ symbol }) => symbol),
    ).toEqual(["NULL"]);
    expect(
      screenRows(
        rows,
        { ...filters, index: UNREPORTED },
        { column: "symbol", direction: "asc" },
      ).map(({ symbol }) => symbol),
    ).toEqual(["NULL"]);
  });

  it("formats fractions, multiples, counts and gaps without judgments", () => {
    expect(formatValue(0.125, "percent")).toBe("12.50%");
    expect(formatValue(-0.125, "percent")).toBe("-12.50%");
    expect(formatValue(2, "multiple")).toBe("2.00×");
    expect(formatValue(0, "count")).toBe("0");
    expect(formatValue(null, "percent")).toBe("Not reported");
    expect(formatMarketCap(182580824661400)).toBe("IDR 182.58T");
    expect(formatMarketCap(null)).toBe("Not reported");
    expect(formatInput(null)).toBe("Not reported");
    expect(formatInput(0.025)).toBe("0.025");
    expect(formatPeers(0.84, 31)).toBe("p84 · 31 peers");
    expect(formatPeers(null, 4)).toBe("4 peers · no percentile");
  });
});
