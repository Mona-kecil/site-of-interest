import { financialSubSectors } from "../../universe/checks.mjs";

export type Bound = readonly [">=" | "<=" | ">" | "<", number];
export type Rule = { key: string; pass?: Bound; fail?: Bound };
export type CompanyClass = "nonFinancial" | "bank" | "otherFinancial";
export type PillarId = "cash" | "returns" | "balance" | "price" | "owners";
export type Outcome = "pass" | "mixed" | "fail" | "unknown" | "na";
export type Verdict = "idea" | "mixed" | "flags" | "thin";

export const verdictLabels: Record<Verdict, string> = {
  idea: "Worth a look",
  mixed: "Mixed",
  flags: "Red flags",
  thin: "Not enough data",
};

const roe: Rule[] = [{ key: "roe", pass: [">=", 0.12], fail: ["<", 0.05] }];
const financialPrice: Rule[] = [
  { key: "pb_vs_history", pass: ["<=", 1], fail: [">", 1.5] },
  { key: "pe_vs_history", pass: ["<=", 1], fail: [">", 1.5] },
  { key: "pe_ttm", fail: [">", 50] },
];
const owners: Rule[] = [
  { key: "share_dilution", pass: ["<=", 0.05], fail: [">", 0.25] },
  { key: "dividend_years", pass: [">=", 4] },
  { key: "free_float", fail: ["<", 0.1] },
];

export const PILLARS: {
  id: PillarId;
  title: string;
  question: string;
  headlines: Record<"pass" | "mixed" | "fail", string>;
  rules: Record<CompanyClass, Rule[]>;
}[] = [
  {
    id: "cash",
    title: "Cash",
    question: "Does profit turn into cash?",
    headlines: {
      pass: "Profit turns into cash",
      mixed: "Cash backs only part of the profit",
      fail: "Profit is not turning into cash",
    },
    rules: {
      nonFinancial: [
        { key: "cash_conversion", pass: [">=", 0.8], fail: ["<", 0.5] },
        { key: "fcf_yield", pass: [">", 0] },
      ],
      bank: [],
      otherFinancial: [],
    },
  },
  {
    id: "returns",
    title: "Returns",
    question: "Does it earn well on its capital?",
    headlines: {
      pass: "High returns on capital",
      mixed: "Middling returns on capital",
      fail: "Low returns on capital",
    },
    rules: {
      nonFinancial: [{ key: "roic", pass: [">=", 0.12], fail: ["<", 0.05] }],
      bank: roe,
      otherFinancial: roe,
    },
  },
  {
    id: "balance",
    title: "Balance sheet",
    question: "Can the balance sheet take a hit?",
    headlines: {
      pass: "Debt is under control",
      mixed: "Some balance-sheet strain",
      fail: "Debt is a burden",
    },
    rules: {
      nonFinancial: [
        { key: "net_debt_to_ebitda", pass: ["<=", 2], fail: [">", 4] },
        { key: "interest_coverage", pass: [">=", 4], fail: ["<", 1.5] },
      ],
      bank: [
        { key: "npl_ratio", pass: ["<=", 0.03], fail: [">", 0.05] },
        { key: "capital_adequacy", pass: [">=", 0.18], fail: ["<", 0.14] },
        { key: "loan_to_deposit", pass: ["<=", 0.95], fail: [">", 1.1] },
      ],
      otherFinancial: [],
    },
  },
  {
    id: "price",
    title: "Price",
    question: "Is the price too high for what it earns?",
    headlines: {
      pass: "Cheap for what it earns",
      mixed: "Fairly priced",
      fail: "Expensive for what it earns",
    },
    rules: {
      nonFinancial: [
        { key: "pe_vs_history", pass: ["<=", 1], fail: [">", 1.5] },
        { key: "fcf_yield", pass: [">=", 0.05] },
        { key: "pe_ttm", fail: [">", 50] },
      ],
      bank: financialPrice,
      otherFinancial: financialPrice,
    },
  },
  {
    id: "owners",
    title: "Owners",
    question: "Are minority holders treated fairly?",
    headlines: {
      pass: "Steady dividends and little dilution",
      mixed: "Some dilution or patchy dividends",
      fail: "Heavy dilution or a thin free float",
    },
    rules: { nonFinancial: owners, bank: owners, otherFinancial: owners },
  },
];

export const CORE: Record<CompanyClass, PillarId[]> = {
  nonFinancial: ["cash", "balance"],
  bank: ["returns", "balance"],
  otherFinancial: ["returns", "balance"],
};

export function companyClassOf(subSector: string | null): CompanyClass {
  return subSector === "Banks"
    ? "bank"
    : financialSubSectors.has(subSector ?? "")
      ? "otherFinancial"
      : "nonFinancial";
}

export function judge(rule: Rule, value: number): "pass" | "neutral" | "fail" {
  const holds = (value: number, [operator, threshold]: Bound) => {
    switch (operator) {
      case ">=":
        return value >= threshold;
      case "<=":
        return value <= threshold;
      case ">":
        return value > threshold;
      case "<":
        return value < threshold;
    }
  };
  return rule.fail && holds(value, rule.fail)
    ? "fail"
    : !rule.pass || holds(value, rule.pass)
      ? "pass"
      : "neutral";
}

export function ratePillar(
  rules: readonly Rule[],
  evidence: readonly { key: string; result: "pass" | "neutral" | "fail" }[],
): Outcome {
  return rules.length === 0
    ? "na"
    : evidence.length === 0
      ? "unknown"
      : evidence.some(({ result }) => result === "fail")
        ? "fail"
        : rules.some(({ pass }) => pass) &&
            rules.every(({ key, pass }) => !pass || evidence.some((item) => item.key === key)) &&
            evidence.every(({ result }) => result === "pass")
          ? "pass"
          : "mixed";
}

export function assess({
  subSector,
  checks,
  peTtm,
}: {
  subSector: string | null;
  checks: readonly { checkId: string; value: number | null }[];
  peTtm: number | null;
}) {
  const companyClass = companyClassOf(subSector);
  const values = new Map(checks.map(({ checkId, value }) => [checkId, value]));
  values.set("pe_ttm", peTtm);
  const pillars = PILLARS.map((pillar) => {
    const rules = pillar.rules[companyClass];
    const evidence = rules.flatMap((rule) => {
      const value = values.get(rule.key) ?? null;
      if (value === null) return [];
      const result = judge(rule, value);
      return [{ ...rule, value, result }];
    });
    const missing = rules.filter((rule) => values.get(rule.key) == null);
    const outcome = ratePillar(rules, evidence);
    const headline =
      outcome === "na" || outcome === "unknown"
        ? null
        : outcome === "mixed" && evidence.every(({ result }) => result === "pass")
          ? "Nothing flagged, but some figures are missing"
          : pillar.id === "balance" && companyClass === "bank"
            ? {
                pass: "Loans and capital look sound",
                mixed: "Some strain on loans or capital",
                fail: "Loans or capital under strain",
              }[outcome]
            : pillar.id === "price" && companyClass !== "nonFinancial" && outcome === "pass"
              ? "Cheap against its own history"
              : pillar.headlines[outcome];
    return { id: pillar.id, outcome, evidence, missing, headline };
  });
  const verdict: Verdict = pillars.some(({ outcome }) => outcome === "fail")
    ? "flags"
    : pillars.filter(
          ({ outcome }) => outcome === "pass" || outcome === "mixed" || outcome === "fail",
        ).length < 3
      ? "thin"
      : CORE[companyClass].every(
            (id) => pillars.find((pillar) => pillar.id === id)!.outcome === "pass",
          ) && pillars.filter(({ outcome }) => outcome !== "na" && outcome !== "pass").length <= 1
        ? "idea"
        : "mixed";
  return { verdict, pillars };
}
