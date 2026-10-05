import { describe, expect, it } from "vitest";
import companies from "../../../data/universe/companies.json";
import snapshot from "../../../data/universe/checks.json";
import manifest from "../../../data/universe/manifest.json";
import years from "../../../data/universe/years.json";
import { CHECKS, companyCheckData } from "../../universe/checks.mjs";
import { assess } from "../ideas/ideas-model";
import { HISTORY_YEARS, pillarRecords } from "./history-model";

const sourceIds = Object.fromEntries(manifest.groups.map(({ id }) => [id, `${id}-fixture`]));
const company = { symbol: "TEST", subSector: null, current: { marketCap: 100 }, sourceIds };
const annual = [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year, index) => ({
  year,
  sourceIds,
  values: {
    operatingCashFlow: [4, 8, 18, 1000, 1000, 1000, 1000][index],
    earnings: [2, 4, 6, 100, 100, 100, 100][index],
    totalEquity: year === 2020 ? 60 : 100,
    freeCashFlow: year === 2021 ? 5 : null,
    ebit: year === 2021 ? 20 : 100,
    totalDebt: year === 2021 ? 40 : 200,
    cashAndEquivalents: year === 2021 ? 20 : 100,
    tax: 4,
    earningsBeforeTax: 20,
    interestCoverageRatio: year === 2021 ? 5 : 10,
    ebitda: year === 2021 ? 10 : 100,
    nonPerformingLoan: year === 2021 ? 2 : 20,
    grossLoan: 100,
    loanToDepositRatio: year === 2021 ? 0.8 : 1.2,
    capitalAdequacyRatio: year === 2021 ? 0.25 : 0.1,
  },
}));

describe("statement pillar history", () => {
  it("matches current FY2025 pillar outcomes and stored readings across the universe", () => {
    for (const company of companies.filter(({ current }) => (current.marketCap ?? 0) > 0)) {
      const annual = years.filter(({ symbol }) => symbol === company.symbol);
      const checks = snapshot.results.filter(({ symbol }) => symbol === company.symbol);
      const current = assess({
        subSector: company.subSector,
        peTtm: company.current.peTtm,
        checks,
      });
      const records = pillarRecords(company, annual);
      expect(records.map(({ id }) => id)).toEqual(["cash", "returns", "balance"]);
      for (const record of records) {
        expect(record.years.map(({ year }) => year)).toEqual(HISTORY_YEARS);
        const latest = record.years.find(({ year }) => year === 2025)!;
        expect(latest.outcome, `${company.symbol} ${record.id}`).toBe(
          current.pillars.find(({ id }) => id === record.id)!.outcome,
        );
        expect(latest.readings).toHaveLength(record.rules.length);
        for (const reading of latest.readings) {
          const stored =
            reading.key === "free_cash_flow"
              ? (annual.find(({ year }) => year === 2025)?.values.freeCashFlow ?? null)
              : checks.find(({ checkId }) => checkId === reading.key)!.value;
          expect(reading.value, `${company.symbol} ${reading.key}`).toBe(stored);
          if (reading.value === null) {
            expect(reading.gap).toEqual(expect.any(String));
            expect(reading.result).toBeNull();
          } else {
            expect(reading.gap).toBeNull();
            expect(reading.result).not.toBeNull();
          }
        }
      }
    }
  });

  it("shifts the cash window and average-equity base to FY2021", () => {
    const cash = pillarRecords(company, annual)[0];
    expect(cash.rules).toEqual([
      { key: "cash_conversion", pass: [">=", 0.8], fail: ["<", 0.5] },
      { key: "free_cash_flow", pass: [">", 0] },
    ]);
    expect(cash.years[0].readings[0].value).toBe(2.5);
    expect(cash.years[0].readings[1].value).toBe(5);
    const bank = pillarRecords({ ...company, subSector: "Banks" }, annual);
    expect(bank[1].years[0].readings[0].value).toBe(0.075);
    const data = companyCheckData(company, annual, [], manifest);
    const cashCheck = CHECKS.find(({ id }) => id === "cash_conversion")!.compute(data, 2021);
    expect(cashCheck.period).toBe("FY2019–FY2021");
    expect(cashCheck.inputs.map(({ period }) => period)).toEqual([
      "2019",
      "2020",
      "2021",
      "2019",
      "2020",
      "2021",
    ]);
    const roe = CHECKS.find(({ id }) => id === "roe")!.compute(data, 2021);
    expect(roe.period).toBe("FY2021 / average FY2020–FY2021");
    expect(roe.inputs.map(({ period }) => period)).toEqual(["2021", "2020", "2021"]);
  });

  it("reads each single-year statement check from the requested year", () => {
    const records = pillarRecords(company, annual);
    expect(records[1].years[0].readings[0].value).toBe(16 / 120);
    expect(records[2].years[0].readings.map(({ value }) => value)).toEqual([2, 5]);
    const bank = pillarRecords({ ...company, subSector: "Banks" }, annual);
    expect(bank[2].years[0].readings.map(({ value }) => value)).toEqual([0.02, 0.25, 0.8]);
  });

  it("keeps missing periods as gaps and distinguishes unknown from non-applicable pillars", () => {
    const records = pillarRecords(company, []);
    for (const record of records) {
      expect(record.years.every(({ outcome }) => outcome === "unknown")).toBe(true);
      expect(
        record.years.every(({ readings }) =>
          readings.every(
            ({ value, result, gap }) =>
              value === null && result === null && gap?.startsWith("Not reported:"),
          ),
        ),
      ).toBe(true);
    }
    expect(records[0].years[0].readings[1].gap).toBe("Not reported: free_cash_flow[2021]");
    const financial = pillarRecords({ ...company, subSector: "Insurance" }, []);
    expect(financial[0].rules).toEqual([]);
    expect(
      financial[0].years.every(
        ({ outcome, readings }) => outcome === "na" && readings.length === 0,
      ),
    ).toBe(true);
    expect(financial[1].years.every(({ outcome }) => outcome === "unknown")).toBe(true);
    expect(financial[2].years.every(({ outcome }) => outcome === "na")).toBe(true);
  });
});
