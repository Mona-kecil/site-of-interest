import type { Bound, Outcome, Rule, Verdict } from "./ideas-model";

type Unit = "%" | "×" | "pe" | "years";

export const outcomeLabels: Record<Outcome, string> = {
  pass: "Passes",
  mixed: "Partly passes",
  fail: "Flagged",
  unknown: "Not reported",
  na: "Not checked",
};
// Pillar titles for narrow columns, in PILLARS order.
export const shortTitles = ["Cash", "Returns", "Balance", "Price", "Owners"];
export const verdictDescriptions: Record<Verdict, string> = {
  flags: "At least one pillar crosses a flag line.",
  idea: "No flags, the two core pillars pass (cash and balance sheet; returns and balance sheet for banks), and at most one other pillar falls short.",
  mixed: "No flags, but the core pillars don’t both pass, or two or more pillars fall short.",
  thin: "No flags, but fewer than three pillars could be measured.",
};

// Each measurement's label at three widths: callouts, the number reveal, and the number reveal on phones.
export const MEASURES: Record<string, { label: string; short: string; tiny: string; unit: Unit }> =
  {
    cash_conversion: {
      label: "Cash conversion, 3 yrs",
      short: "Cash conv.",
      tiny: "Cash conv",
      unit: "×",
    },
    fcf_yield: { label: "FCF yield", short: "FCF yield", tiny: "FCF yld", unit: "%" },
    roic: { label: "ROIC", short: "ROIC", tiny: "ROIC", unit: "%" },
    roe: { label: "ROE", short: "ROE", tiny: "ROE", unit: "%" },
    net_debt_to_ebitda: {
      label: "Net debt / EBITDA",
      short: "Net debt/EBITDA",
      tiny: "ND/EBITDA",
      unit: "×",
    },
    interest_coverage: {
      label: "Interest coverage",
      short: "Int. cover",
      tiny: "Int cover",
      unit: "×",
    },
    npl_ratio: { label: "NPL ratio", short: "NPL", tiny: "NPL", unit: "%" },
    capital_adequacy: { label: "Capital adequacy", short: "CAR", tiny: "CAR", unit: "%" },
    loan_to_deposit: { label: "Loan to deposit", short: "LDR", tiny: "LDR", unit: "%" },
    pe_vs_history: {
      label: "P/E against its history",
      short: "P/E vs hist.",
      tiny: "P/E hist",
      unit: "×",
    },
    pb_vs_history: {
      label: "P/B against its history",
      short: "P/B vs hist.",
      tiny: "P/B hist",
      unit: "×",
    },
    pe_ttm: { label: "P/E, trailing", short: "P/E", tiny: "P/E", unit: "pe" },
    share_dilution: {
      label: "Share dilution, 5 yrs",
      short: "Dilution",
      tiny: "Dilution",
      unit: "%",
    },
    dividend_years: {
      label: "Years paying dividends",
      short: "Dividends",
      tiny: "Div yrs",
      unit: "years",
    },
    free_float: { label: "Free float", short: "Free float", tiny: "Float", unit: "%" },
  };

export function formatReading(key: string, value: number) {
  const unit = MEASURES[key].unit;
  const text =
    unit === "%"
      ? `${(value * 100).toFixed(1)}%`
      : unit === "pe"
        ? value >= 1000
          ? Math.round(value).toLocaleString("en-US")
          : value.toFixed(1)
        : unit === "years"
          ? `${value} of 6`
          : `${value.toFixed(2)}×`;
  return text.replace(/^-(0(?:\.0+)?)(?=[%×]|$)/, "$1");
}

export function formatLine(key: string, threshold: number) {
  const unit = MEASURES[key].unit;
  if (unit === "%") return `${+(threshold * 100).toFixed(1)}%`;
  if (unit === "pe") return String(threshold);
  if (unit === "years") return `${threshold} years`;
  return `${+threshold.toFixed(2)}×`;
}

export function phrase([operator, threshold]: Bound, key: string) {
  const line = formatLine(key, threshold);
  return {
    ">=": `at ${line} or more`,
    "<=": `at ${line} or less`,
    ">": `above ${line}`,
    "<": `below ${line}`,
  }[operator];
}

export function ruleLines(rule: Rule) {
  const text = [
    rule.pass && `passes ${phrase(rule.pass, rule.key)}`,
    rule.fail && `flagged ${phrase(rule.fail, rule.key)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return text[0].toUpperCase() + text.slice(1);
}

// The measurement that decides a pillar's mark: the first flag, else the first shortfall.
export function deciding<T extends { result: "pass" | "neutral" | "fail" }>(evidence: T[]) {
  return (
    evidence.find(({ result }) => result === "fail") ??
    evidence.find(({ result }) => result === "neutral") ??
    evidence[0]
  );
}

export function shortName(name: string) {
  return name
    .replace(/^PT\.?\s+/i, "")
    .replace(/,?\s+Tbk\.?$/i, "")
    .replace(/\s*\(Persero\)/i, "")
    .trim();
}
