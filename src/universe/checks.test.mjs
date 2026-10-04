import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { addPercentiles, applies, buildChecks, CHECKS, companyCheckData, companyResults } from "./checks.mjs";
import { emptyCompany, emptyValues, fieldReferences } from "./fields.mjs";
import { readUniverse } from "./files.mjs";

function fixture(subSector = "Industrial Goods") {
  const company = emptyCompany("TEST", "Test Company");
  company.subSector = subSector;
  company.sourceIds = { annual: "annual-page", current: "current-page" };
  Object.assign(company.current, { marketCap: 100, freeFloat: 0.35, peTtm: 14, pbMrq: 7 });
  const references = fieldReferences();
  const manifest = { groups: [
    { id: "annual", fields: references.filter(({ scope }) => scope === "year").map(({ field }) => field) },
    { id: "current", fields: references.filter(({ scope }) => scope === "company").map(({ field }) => field) },
  ] };
  const years = [2020, 2021, 2022, 2023, 2024, 2025].map((year, index) => ({
    symbol: "TEST", year, sourceIds: { annual: "annual-page" },
    values: { ...emptyValues("year"), revenue: year === 2025 ? 3200 : 100, pe: 2 * (index + 1), pb: index + 1, totalDividend: [null, 0, 2, 0, 3, 4][index] },
  }));
  for (const [index, year] of years.slice(3).entries()) Object.assign(year.values, {
    operatingCashFlow: 10 * (index + 1), earnings: 5 * (index + 1), capitalExpenditure: 2 * (index + 1), totalEquity: 80,
  });
  Object.assign(years[0].values, { outstandingShares: 100 });
  Object.assign(years[5].values, {
    outstandingShares: 125, freeCashFlow: 25, ebit: 25, tax: 4, earningsBeforeTax: 20,
    totalDebt: 40, cashAndEquivalents: 20, ebitda: 10, currentAssets: 45, currentLiabilities: 15,
    interestCoverageRatio: 5, nonPerformingLoan: 2, grossLoan: 100, loanToDepositRatio: 0.8,
    capitalAdequacyRatio: 0.25, netInterestMargin: 0.04,
  });
  const holdings = [["Owner", "entity", 0.6], ["Partner", "entity", 0.2], ["Public", "public", 0.9], ["Treasury", "treasury", 0.8]].map(([holderName, holderKind, percentage]) => ({
    symbol: "TEST", holderName, holderKind, percentage, sourceId: "holder-page",
  }));
  return companyCheckData(company, years, holdings, manifest);
}

const compute = (id, data = fixture()) => CHECKS.find((check) => check.id === id).compute(data);
const expected = {
  cash_conversion: 2, fcf_yield: 0.25, roic: 0.2, roe: 0.1875, interest_coverage: 5,
  net_debt_to_ebitda: 2, current_ratio: 3, reinvestment_rate: 0.2, share_dilution: 0.25,
  revenue_cagr: 1, pe_vs_history: 2, pb_vs_history: 2, dividend_years: 3, free_float: 0.35,
  largest_holder: 0.6, npl_ratio: 0.02, loan_to_deposit: 0.8, capital_adequacy: 0.25, net_interest_margin: 0.04,
};

for (const [id, value] of Object.entries(expected)) test(`${id}: exact hand-built value`, () => {
  const result = compute(id);
  assert.equal(result.value, value);
  assert.equal(result.gap, null);
  assert.ok(result.inputs.length);
});

test("nulls remain inputs and produce a named gap instead of zero", () => {
  const data = fixture();
  data.years.get(2024).values.operatingCashFlow = null;
  const row = compute("cash_conversion", data);
  assert.equal(row.value, null);
  assert.match(row.gap, /operating_cash_flow\[2024\]/);
  assert.equal(row.inputs.find(({ field }) => field === "operating_cash_flow[2024]").value, null);
});

test("applicability follows financial sub-sectors", () => {
  const bank = companyResults(fixture("Banks")).map(({ checkId }) => checkId);
  assert.ok(bank.includes("npl_ratio"));
  assert.ok(bank.includes("roe"));
  assert.ok(!bank.includes("roic"));
  const industrial = companyResults(fixture()).map(({ checkId }) => checkId);
  assert.ok(industrial.includes("roic"));
  assert.ok(!industrial.includes("npl_ratio"));
  for (const subSector of ["Insurance", "Financing Service", "Investment Service"]) {
    assert.equal(applies(CHECKS.find(({ id }) => id === "roic"), { subSector }), false);
    assert.equal(applies(CHECKS.find(({ id }) => id === "npl_ratio"), { subSector }), false);
  }
});

test("ROIC records the effective tax rate and each statutory fallback", () => {
  assert.match(compute("roic").inputs.find(({ key }) => key === "tax").label, /0\.2 \(tax \/ EBT\)/);
  for (const [tax, ebt] of [[null, 20], [4, null], [4, 0], [4, -20], [-4, 20], [30, 20]]) {
    const data = fixture();
    Object.assign(data.years.get(2025).values, { tax, earningsBeforeTax: ebt });
    const result = compute("roic", data);
    assert.equal(result.value, 0.195);
    assert.equal(result.gap, null);
    assert.match(result.inputs.find(({ key }) => key === "tax").label, /0\.22 \(Indonesian statutory fallback\)/);
  }
});

test("source IDs resolve by manifest group, including omitted all-null years and holdings", () => {
  const data = fixture();
  assert.deepEqual(compute("fcf_yield", data).inputs, [
    { key: "freeCashFlow", field: "free_cash_flow[2025]", period: "2025", value: 25, sourceId: "annual-page" },
    { key: "marketCap", field: "market_cap", period: "current", value: 100, sourceId: "current-page" },
  ]);
  const holder = compute("largest_holder", data).inputs[0];
  assert.equal(holder.key, "Owner");
  assert.equal(holder.sourceId, "holder-page");
  data.years.delete(2024);
  const missing = compute("cash_conversion", data).inputs.find(({ period }) => period === "2024");
  assert.equal(missing.value, null);
  assert.equal(missing.sourceId, "annual-page");
});

test("undefined ratios and nonpositive required denominators give reasons", () => {
  for (const [id, key, value] of [
    ["fcf_yield", "marketCap", 0], ["roe", "totalEquity", 0], ["roic", "cashAndEquivalents", 120],
    ["net_debt_to_ebitda", "ebitda", -1], ["current_ratio", "currentLiabilities", 0],
    ["share_dilution", "outstandingShares", 0], ["revenue_cagr", "revenue", -1], ["npl_ratio", "grossLoan", 0],
  ]) {
    const data = fixture();
    if (key === "marketCap") data.company.current[key] = value;
    else if (id === "roe") for (const year of [2024, 2025]) data.years.get(year).values[key] = value;
    else data.years.get(id === "share_dilution" ? 2020 : 2025).values[key] = value;
    const row = compute(id, data);
    assert.equal(row.value, null, id);
    assert.ok(row.gap, id);
  }
  for (const [id, key] of [["cash_conversion", "earnings"], ["reinvestment_rate", "operatingCashFlow"]]) {
    const data = fixture();
    for (const year of [2023, 2024, 2025]) data.years.get(year).values[key] = 0;
    assert.equal(compute(id, data).value, null);
  }
});

test("history uses positive reported years, counts even medians and keeps missing years", () => {
  const data = fixture();
  data.years.get(2020).values.pe = null;
  data.years.get(2021).values.pe = -10;
  assert.equal(compute("pe_vs_history", data).value, 14 / 9);
  data.years.get(2022).values.pe = 0;
  assert.equal(compute("pe_vs_history", data).value, 1.4);
  data.years.get(2023).values.pe = null;
  assert.match(compute("pe_vs_history", data).gap, /Fewer than 3/);
  data.company.current.peTtm = -1;
  assert.match(compute("pe_vs_history", data).gap, /zero or negative/);
});

test("dividend null years count as not reported and stay null in evidence", () => {
  const row = compute("dividend_years");
  assert.equal(row.value, 3);
  assert.equal(row.inputs[0].value, null);
  assert.match(CHECKS.find(({ id }) => id === "dividend_years").formula, /null year counts as not reported/);
});

test("reinvestment treats a negative capex report as the same outflow", () => {
  const data = fixture();
  for (const year of [2023, 2024, 2025]) data.years.get(year).values.capitalExpenditure *= -1;
  const row = compute("reinvestment_rate", data);
  assert.equal(row.value, 0.2);
  assert.equal(row.inputs[0].value, -2);
});

test("a missing entity percentage prevents a partial largest-holder value", () => {
  const data = fixture();
  data.holdings[1].percentage = null;
  assert.equal(compute("largest_holder", data).value, null);
  assert.match(compute("largest_holder", data).gap, /Partner/);
  data.holdings = [];
  assert.equal(compute("largest_holder", data).inputs[0].sourceId, "current-page");
});

function peerRows(values, subSector = "Industrial Goods", checkId = "roe") {
  return values.map((value, index) => ({ symbol: `${index}`, checkId, subSector, value }));
}

test("percentiles use inclusive tie counts, excluding missing values and other sub-sectors", () => {
  const rows = addPercentiles([...peerRows([1, 2, 2, 3, 4, null]), ...peerRows([100, 200, 300, 400], "Banks")]);
  assert.deepEqual(rows.slice(0, 6).map(({ percentile }) => percentile), [0, 0.375, 0.375, 0.75, 1, null]);
  assert.ok(rows.slice(0, 6).every(({ peerCount }) => peerCount === 5));
  assert.ok(rows.slice(6).every(({ percentile, peerCount }) => percentile === null && peerCount === 4));
});

test("tied extrema share a midrank; all-equal peers have percentile 0.5", () => {
  assert.deepEqual(addPercentiles(peerRows([1, 1, 2, 3, 3])).map(({ percentile }) => percentile), [0.125, 0.125, 0.5, 0.875, 0.875]);
  assert.ok(addPercentiles(peerRows([1, 1, 1, 1, 1])).every(({ percentile }) => percentile === 0.5));
  assert.equal(addPercentiles(peerRows([null]))[0].peerCount, 0);
  assert.equal(addPercentiles(peerRows([1]))[0].percentile, null);
});

test("real snapshot coverage, finite values, complete provenance and committed output", async () => {
  const directory = new URL("../../data/universe/", import.meta.url);
  const snapshot = await readUniverse(directory.pathname);
  const checks = buildChecks(snapshot);
  const sources = new Set(snapshot.sources.map(({ id }) => id));
  const symbols = new Set(snapshot.companies.map(({ symbol }) => symbol));
  const companyBySymbol = new Map(snapshot.companies.map((company) => [company.symbol, company]));
  const seen = new Set();
  for (const row of checks.results) {
    assert.ok(symbols.has(row.symbol));
    assert.ok(row.value === null ? typeof row.gap === "string" : Number.isFinite(row.value) && row.gap === null);
    assert.ok(row.percentile === null || (row.percentile >= 0 && row.percentile <= 1));
    assert.ok(row.inputs.every(({ sourceId }) => sources.has(sourceId)), `${row.symbol} ${row.checkId}`);
    assert.ok(applies(CHECKS.find(({ id }) => id === row.checkId), companyBySymbol.get(row.symbol)));
    assert.ok(!seen.has(`${row.symbol}:${row.checkId}`));
    seen.add(`${row.symbol}:${row.checkId}`);
  }
  for (const check of CHECKS) {
    const rows = checks.results.filter(({ checkId }) => checkId === check.id);
    assert.equal(rows.length, snapshot.companies.filter((company) => applies(check, company)).length);
    assert.ok(rows.some(({ value }) => value !== null), check.id);
  }
  const asii = snapshot.years.find(({ symbol, year }) => symbol === "ASII" && year === 2025).values;
  assert.equal(asii.capitalExpenditure, 28176000000000);
  assert.equal(asii.operatingCashFlow - asii.capitalExpenditure, asii.freeCashFlow);
  const ades = snapshot.years.find(({ symbol, year }) => symbol === "ADES" && year === 2025).values;
  assert.ok(ades.capitalExpenditure < 0);
  assert.equal(ades.operatingCashFlow + ades.capitalExpenditure, ades.freeCashFlow);
  const stored = JSON.parse(await readFile(new URL("checks.json", directory), "utf8"));
  assert.deepEqual(stored, checks);
});
