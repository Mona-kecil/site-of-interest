export const YEARS = Object.freeze(Array.from({ length: 7 }, (_, index) => 2019 + index));
export const QUARTERS = Object.freeze(Array.from({ length: 8 }, (_, index) => {
  const quarter = index + 2;
  return `Q${quarter % 4 + 1}-${2024 + Math.floor(quarter / 4)}`;
}));

const company = (key, providerField, unit, target = "current") => ({ key, providerField, scope: "company", unit, target });
const year = (key, providerField, unit = "IDR") => ({ key, providerField, scope: "year", unit, periods: YEARS });
const quarter = (key, providerField) => ({ key, providerField, scope: "quarter", unit: "IDR", periods: QUARTERS });

export const FIELD_DEFINITIONS = Object.freeze([
  company("sector", "sector", "text", "company"),
  company("subSector", "sub_sector", "text", "company"),
  company("industry", "industry", "text", "company"),
  company("subIndustry", "sub_industry", "text", "company"),
  company("listingBoard", "listing_board", "text", "company"),
  company("listingDate", "listing_date", "date", "company"),
  company("indices", "indices", "list", "company"),
  company("affiliates", "affiliates", "list", "company"),
  company("employees", "employee_num", "count"),
  company("marketCap", "market_cap", "IDR"),
  company("freeFloat", "free_float", "fraction"),
  company("peTtm", "pe_ttm", "ratio"),
  company("pbMrq", "pb_mrq", "ratio"),
  company("psTtm", "ps_ttm", "ratio"),
  company("roeTtm", "roe_ttm", "ratio"),
  company("roaTtm", "roa_ttm", "ratio"),
  company("yieldTtm", "yield_ttm", "fraction"),
  company("dividendTtm", "dividend_ttm", "IDR"),
  company("payoutRatio", "payout_ratio", "ratio"),
  company("totalAssetsMrq", "total_assets_mrq", "IDR"),
  company("totalEquityMrq", "total_equity_mrq", "IDR"),
  company("totalRevenueMrq", "total_revenue_mrq", "IDR"),
  company("earningsMrq", "earnings_mrq", "IDR"),
  company("majorShareholdersName", "major_shareholders_name", "list", "holdings"),
  year("revenue", "revenue"),
  year("grossProfit", "gross_profit"),
  year("ebit", "ebit"),
  year("earningsBeforeTax", "earnings_before_tax"),
  year("tax", "tax"),
  year("earnings", "earnings"),
  year("operatingCashFlow", "operating_cash_flow"),
  year("capitalExpenditure", "capital_expenditure"),
  year("freeCashFlow", "free_cash_flow"),
  year("interestExpense", "interest_expense"),
  year("totalAssets", "total_assets"),
  year("totalLiabilities", "total_liabilities"),
  year("totalEquity", "total_equity"),
  year("totalDebt", "total_debt"),
  year("cashAndEquivalents", "cash_and_equivalents"),
  year("currentAssets", "current_assets"),
  year("currentLiabilities", "current_liabilities"),
  year("outstandingShares", "outstanding_shares", "count"),
  year("totalDividend", "total_dividend"),
  year("pe", "pe", "ratio"),
  year("pb", "pb", "ratio"),
  year("grossLoan", "gross_loan"),
  year("nonPerformingLoan", "non_performing_loan"),
  year("netInterestMargin", "net_interest_margin", "ratio"),
  year("loanToDepositRatio", "loan_to_deposit_ratio", "ratio"),
  year("capitalAdequacyRatio", "capital_adequacy_ratio", "ratio"),
  quarter("revenueQ", "revenue_q"),
  quarter("earningsQ", "earnings_q"),
  quarter("operatingCashFlowQ", "operating_cash_flow_q"),
  quarter("freeCashFlowQ", "free_cash_flow_q"),
  year("interestCoverageRatio", "interest_coverage_ratio", "ratio"),
  year("ebitda", "ebitda"),
  year("inventories", "inventories"),
  year("financingCashFlow", "financing_cash_flow"),
].map(Object.freeze));

export function fieldReferences(registry = FIELD_DEFINITIONS) {
  return registry.flatMap((definition) => (definition.periods ?? [null]).map((period) => ({
    ...definition,
    period,
    field: period === null ? definition.providerField : `${definition.providerField}[${period}]`,
  })));
}

export function emptyValues(scope) {
  return Object.fromEntries(FIELD_DEFINITIONS.filter((field) => field.scope === scope).map(({ key }) => [key, null]));
}

export function emptyCompany(symbol, name) {
  const row = { symbol, name, current: {}, sourceIds: {} };
  for (const field of FIELD_DEFINITIONS.filter((field) => field.scope === "company" && field.target !== "holdings")) {
    (field.target === "company" ? row : row.current)[field.key] = null;
  }
  return row;
}
