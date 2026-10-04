import { FIELD_DEFINITIONS } from "./fields.mjs";

const financialSubSectors = new Set(["Banks", "Insurance", "Financing Service", "Investment Service"]);
const fields = new Map(FIELD_DEFINITIONS.map((field) => [field.key, field]));
const recentYears = [2023, 2024, 2025];
const historyYears = [2020, 2021, 2022, 2023, 2024, 2025];
const annual = (key, year = 2025) => [key, year];
const current = (key) => [key, null];

export function companyCheckData(company, years, holdings, manifest) {
  return {
    company,
    years: new Map(years.map((row) => [row.year, row])),
    holdings,
    groups: new Map(manifest.groups.flatMap(({ id, fields }) => fields.map((field) => [field, id]))),
  };
}

function input(data, [key, year]) {
  const definition = fields.get(key);
  const field = year === null ? definition.providerField : `${definition.providerField}[${year}]`;
  const row = year === null ? data.company : data.years.get(year);
  const value = (year === null ? row.current[key] : row?.values[key]) ?? null;
  // All-null period rows are omitted from the snapshot; the company retains that page's source.
  const sourceId = (row ?? data.company).sourceIds[data.groups.get(field)];
  if (!sourceId) throw new Error(`${data.company.symbol}: missing source for ${field}`);
  if (value !== null && !Number.isFinite(value)) throw new Error(`${field}: non-finite input`);
  return { key, field, period: year === null ? "current" : String(year), value, sourceId };
}

function result(period, value, gap, inputs) {
  return Number.isFinite(value)
    ? { period, value, gap: null, inputs }
    : { period, value: null, gap: gap ?? "Calculation is not finite", inputs };
}

function calculate(period, references, operation) {
  return (data) => {
    const inputs = references.map((reference) => input(data, reference));
    const missing = inputs.filter(({ value }) => value === null);
    if (missing.length) return result(period, null, `Not reported: ${missing.map(({ field }) => field).join(", ")}`, inputs);
    const computed = operation(inputs.map(({ value }) => value));
    return result(period, computed.value, computed.gap, inputs);
  };
}

function divide(numerator, denominator, name, positive = false) {
  if (positive ? denominator <= 0 : denominator === 0) {
    return { value: null, gap: `${name} is ${positive ? "zero or negative" : "zero"}` };
  }
  return { value: numerator / denominator };
}

const sum = (values) => values.reduce((total, value) => total + value, 0);
const reported = (key) => calculate("FY2025", [annual(key)], ([value]) => ({ value }));
const threeYearRatio = (numerator, denominator, name) => calculate(
  "FY2023–FY2025",
  [...recentYears.map((year) => annual(numerator, year)), ...recentYears.map((year) => annual(denominator, year))],
  (values) => divide(sum(values.slice(0, 3)), sum(values.slice(3)), name, true),
);

function historyRatio(key, currentKey) {
  return (data) => {
    const inputs = [input(data, current(currentKey)), ...historyYears.map((year) => input(data, annual(key, year)))];
    const period = `${currentKey === "peTtm" ? "TTM Q3-2025..Q2-2026" : "MRQ Q2-2026"} / FY2020–FY2025`;
    const latest = inputs[0];
    if (latest.value === null) return result(period, null, `Not reported: ${latest.field}`, inputs);
    if (latest.value <= 0) return result(period, null, `${latest.field} is zero or negative`, inputs);
    const positive = inputs.slice(1).map(({ value }) => value).filter((value) => value !== null && value > 0).sort((a, b) => a - b);
    if (positive.length < 3) return result(period, null, `Fewer than 3 positive ${key.toUpperCase()} years reported`, inputs);
    const middle = Math.floor(positive.length / 2);
    const median = positive.length % 2 ? positive[middle] : (positive[middle - 1] + positive[middle]) / 2;
    return result(period, latest.value / median, null, inputs);
  };
}

export const CHECKS = Object.freeze([
  {
    id: "cash_conversion", label: "Cash conversion", question: "Does reported profit turn into operating cash?", unit: "multiple", appliesTo: "nonFinancial",
    formula: "sum(operating_cash_flow[2023..2025]) / sum(earnings[2023..2025]); requires all inputs and positive earnings sum",
    compute: threeYearRatio("operatingCashFlow", "earnings", "Earnings sum"),
  },
  {
    id: "fcf_yield", label: "FCF yield", question: "What free-cash yield does today's market cap buy?", unit: "percent", appliesTo: "nonFinancial",
    formula: "free_cash_flow[2025] / current market_cap",
    compute: calculate("FY2025 / current", [annual("freeCashFlow"), current("marketCap")], ([fcf, cap]) => divide(fcf, cap, "Market cap")),
  },
  {
    id: "roic", label: "ROIC", question: "What does the business earn on the capital it uses?", unit: "percent", appliesTo: "nonFinancial",
    formula: "ebit[2025] × (1 − t) / (total_debt[2025] + total_equity[2025] − cash_and_equivalents[2025]); t = tax[2025] / earnings_before_tax[2025] when EBT > 0 and 0 ≤ t ≤ 1, otherwise t = 0.22 (Indonesian statutory fallback); requires positive invested capital",
    compute(data) {
      const inputs = ["ebit", "totalDebt", "totalEquity", "cashAndEquivalents", "tax", "earningsBeforeTax"].map((key) => input(data, annual(key)));
      const [ebit, debt, equity, cash, tax, ebt] = inputs.map(({ value }) => value);
      const effective = tax !== null && ebt !== null && ebt > 0 ? tax / ebt : null;
      const usesEffective = effective !== null && effective >= 0 && effective <= 1;
      const rate = usesEffective ? effective : 0.22;
      inputs[4].label = `Tax rate used: ${rate} (${usesEffective ? "tax / EBT" : "Indonesian statutory fallback"})`;
      const missing = inputs.slice(0, 4).filter(({ value }) => value === null);
      if (missing.length) return result("FY2025", null, `Not reported: ${missing.map(({ field }) => field).join(", ")}`, inputs);
      const computed = divide(ebit * (1 - rate), debt + equity - cash, "Invested capital", true);
      return result("FY2025", computed.value, computed.gap, inputs);
    },
  },
  {
    id: "roe", label: "ROE", question: "What does it earn on shareholders' equity?", unit: "percent", appliesTo: "all",
    formula: "earnings[2025] / ((total_equity[2024] + total_equity[2025]) / 2)",
    compute: calculate("FY2025 / average FY2024–FY2025", [annual("earnings"), annual("totalEquity", 2024), annual("totalEquity")], ([earnings, prior, equity]) => divide(earnings, (prior + equity) / 2, "Average equity")),
  },
  {
    id: "interest_coverage", label: "Interest coverage", question: "How many times does operating profit cover interest?", unit: "multiple", appliesTo: "nonFinancial",
    formula: "Provider-reported interest_coverage_ratio[2025]", compute: reported("interestCoverageRatio"),
  },
  {
    id: "net_debt_to_ebitda", label: "Net debt / EBITDA", question: "How many years of EBITDA would repay net debt?", unit: "multiple", appliesTo: "nonFinancial",
    formula: "(total_debt[2025] − cash_and_equivalents[2025]) / ebitda[2025]; requires positive EBITDA",
    compute: calculate("FY2025", [annual("totalDebt"), annual("cashAndEquivalents"), annual("ebitda")], ([debt, cash, ebitda]) => divide(debt - cash, ebitda, "EBITDA", true)),
  },
  {
    id: "current_ratio", label: "Current ratio", question: "Do short-term assets cover short-term obligations?", unit: "multiple", appliesTo: "nonFinancial",
    formula: "current_assets[2025] / current_liabilities[2025]",
    compute: calculate("FY2025", [annual("currentAssets"), annual("currentLiabilities")], ([assets, liabilities]) => divide(assets, liabilities, "Current liabilities")),
  },
  {
    id: "reinvestment_rate", label: "Reinvestment rate", question: "How much operating cash goes back into capex?", unit: "percent", appliesTo: "nonFinancial",
    formula: "sum(capital_expenditure[2023..2025]) / sum(operating_cash_flow[2023..2025]); uses stored signed capex (ASII reports positive outflows; some companies report negative outflows); requires all inputs and positive CFO sum",
    compute: threeYearRatio("capitalExpenditure", "operatingCashFlow", "Operating cash flow sum"),
  },
  {
    id: "share_dilution", label: "Share dilution", question: "How much has the share count changed in five years?", unit: "percent", appliesTo: "all",
    formula: "outstanding_shares[2025] / outstanding_shares[2020] − 1",
    compute: calculate("FY2020–FY2025", [annual("outstandingShares"), annual("outstandingShares", 2020)], ([latest, prior]) => {
      const ratio = divide(latest, prior, "2020 outstanding shares");
      return { ...ratio, value: ratio.value === null ? null : ratio.value - 1 };
    }),
  },
  {
    id: "revenue_cagr", label: "Revenue CAGR", question: "How fast has revenue compounded over five years?", unit: "percent", appliesTo: "all",
    formula: "(revenue[2025] / revenue[2020])^(1/5) − 1; requires both revenues > 0",
    compute: calculate("FY2020–FY2025", [annual("revenue"), annual("revenue", 2020)], ([latest, prior]) => latest <= 0 || prior <= 0 ? { value: null, gap: "2020 or 2025 revenue is zero or negative" } : { value: (latest / prior) ** (1 / 5) - 1 }),
  },
  {
    id: "pe_vs_history", label: "P/E / history", question: "Is today's P/E above or below its own history?", unit: "multiple", appliesTo: "all",
    formula: "pe_ttm / median(positive pe[2020..2025]); requires positive pe_ttm and at least 3 positive reported years; TTM = Q3-2025..Q2-2026", compute: historyRatio("pe", "peTtm"),
  },
  {
    id: "pb_vs_history", label: "P/B / history", question: "Is today's P/B above or below its own history?", unit: "multiple", appliesTo: "all",
    formula: "pb_mrq / median(positive pb[2020..2025]); requires positive pb_mrq and at least 3 positive reported years", compute: historyRatio("pb", "pbMrq"),
  },
  {
    id: "dividend_years", label: "Dividend years", question: "In how many of the last six years was a dividend reported?", unit: "count", appliesTo: "all",
    formula: "count(total_dividend[2020..2025] > 0); a null year counts as not reported, not as a reported zero dividend",
    compute(data) {
      const inputs = historyYears.map((year) => input(data, annual("totalDividend", year)));
      return result("FY2020–FY2025", inputs.filter(({ value }) => value !== null && value > 0).length, null, inputs);
    },
  },
  {
    id: "free_float", label: "Free float", question: "How much of the company trades freely?", unit: "percent", appliesTo: "all",
    formula: "Provider-reported free_float (fraction)", compute: calculate("current", [current("freeFloat")], ([value]) => ({ value })),
  },
  {
    id: "largest_holder", label: "Largest holder", question: "How much does the largest single holder own?", unit: "percent", appliesTo: "all",
    formula: "max(percentage among holdings with holderKind = entity); excludes public and treasury; requires every entity percentage",
    compute(data) {
      const inputs = data.holdings.filter(({ holderKind }) => holderKind === "entity").map((holding) => ({
        key: holding.holderName, field: "major_shareholders_name.share_percentage", period: "current", value: holding.percentage, sourceId: holding.sourceId,
      }));
      if (!inputs.length) {
        const sourceId = data.company.sourceIds[data.groups.get("major_shareholders_name")];
        if (!sourceId) throw new Error(`${data.company.symbol}: missing holdings source`);
        return result("current", null, "No entity holdings reported", [{ key: "majorShareholdersName", field: "major_shareholders_name", period: "current", value: null, sourceId }]);
      }
      const missing = inputs.find(({ value }) => value === null);
      return result("current", missing ? null : Math.max(...inputs.map(({ value }) => value)), missing ? `Not reported: ${missing.key} percentage` : null, inputs);
    },
  },
  {
    id: "npl_ratio", label: "NPL ratio", question: "What share of loans is non-performing?", unit: "percent", appliesTo: "bank",
    formula: "non_performing_loan[2025] / gross_loan[2025]",
    compute: calculate("FY2025", [annual("nonPerformingLoan"), annual("grossLoan")], ([npl, loan]) => divide(npl, loan, "Gross loan")),
  },
  {
    id: "loan_to_deposit", label: "Loan / deposit", question: "How fully are deposits lent out?", unit: "percent", appliesTo: "bank",
    formula: "Provider-reported loan_to_deposit_ratio[2025]", compute: reported("loanToDepositRatio"),
  },
  {
    id: "capital_adequacy", label: "Capital adequacy", question: "How much capital backs risk-weighted assets?", unit: "percent", appliesTo: "bank",
    formula: "Provider-reported capital_adequacy_ratio[2025]", compute: reported("capitalAdequacyRatio"),
  },
  {
    id: "net_interest_margin", label: "Net interest margin", question: "What spread does the bank earn on its assets?", unit: "percent", appliesTo: "bank",
    formula: "Provider-reported net_interest_margin[2025]", compute: reported("netInterestMargin"),
  },
].map(Object.freeze));

export const definitions = CHECKS.map(({ compute, ...definition }) => definition);

export function applies(check, company) {
  return check.appliesTo === "all" || (check.appliesTo === "bank" ? company.subSector === "Banks" : !financialSubSectors.has(company.subSector));
}

export function companyResults(data) {
  return CHECKS.filter((check) => applies(check, data.company)).map((check) => ({
    symbol: data.company.symbol, checkId: check.id, subSector: data.company.subSector,
    ...check.compute(data), percentile: null, peerCount: 0,
  }));
}

export function addPercentiles(results) {
  const peers = new Map();
  for (const row of results) {
    const key = JSON.stringify([row.checkId, row.subSector]);
    if (!peers.has(key)) peers.set(key, []);
    if (row.value !== null) peers.get(key).push(row.value);
  }
  const ranks = new Map();
  for (const [key, values] of peers) {
    values.sort((a, b) => a - b);
    const positions = new Map();
    for (let start = 0; start < values.length;) {
      let end = start + 1;
      while (end < values.length && values[end] === values[start]) end++;
      // below excludes the subject; equal includes it. (equal − 1) counts its tied peers.
      // Untied extrema are 0 and 1; tied extrema share their group's midrank.
      positions.set(values[start], values.length < 5 ? null : (start + 0.5 * (end - start - 1)) / (values.length - 1));
      start = end;
    }
    ranks.set(key, positions);
  }
  return results.map((row) => {
    const key = JSON.stringify([row.checkId, row.subSector]);
    return { ...row, percentile: row.value === null ? null : ranks.get(key).get(row.value), peerCount: peers.get(key).length };
  });
}

export function buildChecks(snapshot) {
  const years = new Map();
  const holdings = new Map();
  for (const [rows, grouped] of [[snapshot.years, years], [snapshot.holdings, holdings]]) {
    for (const row of rows) {
      if (!grouped.has(row.symbol)) grouped.set(row.symbol, []);
      grouped.get(row.symbol).push(row);
    }
  }
  const results = [...snapshot.companies].sort((a, b) => a.symbol.localeCompare(b.symbol)).flatMap((company) =>
    companyResults(companyCheckData(company, years.get(company.symbol) ?? [], holdings.get(company.symbol) ?? [], snapshot.manifest)),
  );
  return { version: 1, sourceRetrievedAt: snapshot.manifest.retrievedAt, definitions, results: addPercentiles(results) };
}
