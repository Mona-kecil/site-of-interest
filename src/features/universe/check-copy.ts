// How each check is worked out, and which way is better, in plain words.
// A null direction marks a check where neither higher nor lower is better on its own.
export const checkCopy: Record<string, { formula: string; better: "higher" | "lower" | null }> = {
  cash_conversion: {
    formula:
      "Operating cash flow divided by earnings, each added up over three years. Above 1× means more cash came in than profit was booked.",
    better: "higher",
  },
  fcf_yield: {
    formula: "Free cash flow for the year divided by today’s market cap.",
    better: "higher",
  },
  roic: {
    formula:
      "Operating profit after tax divided by the capital the business uses (debt plus equity, minus cash). Uses the company’s own tax rate, or Indonesia’s 22% when that can’t be worked out.",
    better: "higher",
  },
  roe: {
    formula: "Earnings divided by shareholders’ equity, averaged over the last two year-ends.",
    better: "higher",
  },
  interest_coverage: {
    formula: "Operating profit divided by interest expense.",
    better: "higher",
  },
  net_debt_to_ebitda: {
    formula:
      "Debt minus cash, divided by EBITDA (profit before interest, tax, depreciation and amortisation). Below zero means the company holds more cash than debt.",
    better: "lower",
  },
  current_ratio: {
    formula: "Current assets divided by current liabilities.",
    better: "higher",
  },
  reinvestment_rate: {
    formula: "Capital spending divided by operating cash flow, each added up over three years.",
    better: null,
  },
  share_dilution: {
    formula:
      "The change in the number of shares over five years. Above zero means new shares were issued.",
    better: "lower",
  },
  revenue_cagr: {
    formula: "Average yearly revenue growth over five years, compounded.",
    better: "higher",
  },
  pe_vs_history: {
    formula:
      "Today’s P/E divided by its median yearly P/E over the past six years, leaving out loss years. Below 1× means cheaper than usual.",
    better: "lower",
  },
  pb_vs_history: {
    formula:
      "Today’s P/B divided by its median yearly P/B over the past six years. Below 1× means cheaper than usual.",
    better: "lower",
  },
  dividend_years: {
    formula: "How many of the last six years had a dividend.",
    better: "higher",
  },
  free_float: {
    formula: "The share of all shares that trades freely on the market.",
    better: "higher",
  },
  largest_holder: {
    formula:
      "The biggest stake held by one named shareholder. Public and treasury shares are left out.",
    better: null,
  },
  npl_ratio: {
    formula: "Non-performing loans divided by gross loans.",
    better: "lower",
  },
  loan_to_deposit: {
    formula: "Loans divided by deposits.",
    better: "lower",
  },
  capital_adequacy: {
    formula: "Capital divided by risk-weighted assets.",
    better: "higher",
  },
  net_interest_margin: {
    formula: "Net interest income divided by earning assets.",
    better: "higher",
  },
};

export function peerNoun(subSector: string | null) {
  return subSector === "Banks" ? "banks" : subSector ? `companies in ${subSector}` : "companies";
}

export function rankLine(
  peers: readonly { symbol: string; value: number | null }[],
  symbol: string,
  better: "higher" | "lower" | null,
  noun: string,
) {
  const own = peers.find((peer) => peer.symbol === symbol)?.value ?? null;
  if (own === null) return null;
  const others = peers.filter((peer) => peer.symbol !== symbol);
  const values = others.flatMap(({ value }) => (value === null ? [] : [value]));
  if (!values.length) return `No other ${noun} have this figure.`;
  const rank =
    1 + values.filter((value) => (better === "lower" ? value < own : value > own)).length;
  const level = values.filter((value) => value === own).length;
  const group = `${values.length + 1} ${noun}${values.length < others.length ? " with data" : ""}`;
  const tie = level ? `, tied with ${level} ${level === 1 ? "other" : "others"}` : "";
  const place = better
    ? `Ranks ${ordinal(rank)}`
    : rank === 1
      ? "Highest"
      : `${ordinal(rank)} highest`;
  return `${place} of ${group}${tie}.`;
}

function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}
