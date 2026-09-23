import type { Infer } from "convex/values";
import { companyFact } from "../../../convex/schema";

type Fact = Infer<typeof companyFact>;
type AnnualFact = Extract<Fact, { kind: "financial_year" }>;

export type SignalInput = {
  label: string;
  factId: string;
  value: number;
  unit: string;
  sourceRefs: Fact["sourceRefs"];
};

export type FundamentalSignal = {
  stableId: string;
  empireSlug: string;
  entityId: string;
  ticker: string;
  companyName: string;
  sector: string;
  metricId: string;
  metricLabel: string;
  period: string;
  asOf: string;
  unit: string;
  formula: string;
  ruleVersion: string;
  value: number | null;
  gap: string | null;
  inputs: SignalInput[];
};

type AnnualField =
  | "revenue"
  | "earnings"
  | "operatingCashFlow"
  | "freeCashFlow"
  | "totalDebt"
  | "totalAssets";
type Rule = {
  id: string;
  label: string;
  numerator: AnnualField;
  denominator: AnnualField;
  operation: "growth" | "ratio";
  unit: string;
  formula: string;
};

export const fundamentalRules: readonly Rule[] = [
  {
    id: "revenue_yoy",
    label: "Revenue year over year",
    numerator: "revenue",
    denominator: "revenue",
    operation: "growth",
    unit: "%",
    formula: "(current revenue / prior revenue − 1) × 100",
  },
  {
    id: "earnings_yoy",
    label: "Earnings year over year",
    numerator: "earnings",
    denominator: "earnings",
    operation: "growth",
    unit: "%",
    formula: "(current earnings / prior earnings − 1) × 100",
  },
  {
    id: "ocf_yoy",
    label: "Operating cash flow year over year",
    numerator: "operatingCashFlow",
    denominator: "operatingCashFlow",
    operation: "growth",
    unit: "%",
    formula: "(current operating cash flow / prior operating cash flow − 1) × 100",
  },
  {
    id: "fcf_yoy",
    label: "Free cash flow year over year",
    numerator: "freeCashFlow",
    denominator: "freeCashFlow",
    operation: "growth",
    unit: "%",
    formula: "(current free cash flow / prior free cash flow − 1) × 100",
  },
  {
    id: "cash_conversion",
    label: "Operating cash flow / earnings",
    numerator: "operatingCashFlow",
    denominator: "earnings",
    operation: "ratio",
    unit: "x",
    formula: "operating cash flow / earnings",
  },
  {
    id: "debt_assets",
    label: "Total debt / total assets",
    numerator: "totalDebt",
    denominator: "totalAssets",
    operation: "ratio",
    unit: "%",
    formula: "total debt / total assets × 100",
  },
  {
    id: "return_assets",
    label: "Earnings / total assets",
    numerator: "earnings",
    denominator: "totalAssets",
    operation: "ratio",
    unit: "%",
    formula: "earnings / total assets × 100",
  },
];

export const sectorTemplates: Record<"non_financial" | "financial" | "unknown", string[]> = {
  non_financial: fundamentalRules.map((rule) => rule.id).concat("reported_pe"),
  financial: [
    "revenue_yoy",
    "earnings_yoy",
    "ocf_yoy",
    "fcf_yoy",
    "cash_conversion",
    "return_assets",
    "reported_pe",
  ],
  unknown: [],
};

export function sectorTemplateFor(summary: string): keyof typeof sectorTemplates {
  const sector = summary.split(" · ")[1]?.split(".")[0]?.trim() ?? "";
  if (/^(Financials|Banks|Insurance|Financial Services)$/i.test(sector)) return "financial";
  if (
    [
      "Basic Materials",
      "Oil, Gas & Coal",
      "Utilities",
      "Heavy Constructions & Civil Engineering",
      "Industrial Goods",
    ].includes(sector)
  )
    return "non_financial";
  return "unknown";
}

function input(fact: AnnualFact, field: AnnualField, label: string): SignalInput | null {
  const value = fact[field];
  if (value === undefined) return null;
  return {
    label,
    factId: fact.id,
    value,
    unit: fact.unit,
    sourceRefs: fact.sourceRefs.map((ref) => ({ ...ref, locator: `${ref.locator}.${field}` })),
  };
}

export function buildFundamentalSignals(args: {
  empireSlug: string;
  entityId: string;
  ticker: string;
  companyName: string;
  summary: string;
  facts: Fact[];
}): FundamentalSignal[] {
  const annual = args.facts
    .filter((fact): fact is AnnualFact => fact.kind === "financial_year")
    .sort((a, b) => a.year - b.year);
  const template = sectorTemplateFor(args.summary);
  const sector = args.summary.split(" · ")[1]?.split(".")[0]?.trim() ?? "Unspecified";
  const result: FundamentalSignal[] = [];

  for (const [index, current] of annual.entries()) {
    const prior = annual[index - 1];
    for (const rule of fundamentalRules) {
      if (!sectorTemplates[template].includes(rule.id)) continue;
      const denominatorFact = rule.operation === "growth" ? prior : current;
      const numerator = input(current, rule.numerator, `FY${current.year} ${rule.numerator}`);
      const denominator = denominatorFact
        ? input(denominatorFact, rule.denominator, `FY${denominatorFact.year} ${rule.denominator}`)
        : null;
      const inputs = [numerator, denominator].filter((item): item is SignalInput => item !== null);
      const sameUnit = numerator?.unit === denominator?.unit;
      const consecutive = rule.operation !== "growth" || prior?.year === current.year - 1;
      const gap = !denominatorFact
        ? "Prior annual record unavailable"
        : !consecutive
          ? "Prior fiscal year unavailable"
          : !numerator || !denominator
            ? "Required input unavailable"
            : !sameUnit
              ? "Input units differ"
              : denominator.value === 0
                ? "Denominator is zero"
                : null;
      const value =
        gap === null && numerator && denominator
          ? rule.operation === "growth"
            ? (numerator.value / denominator.value - 1) * 100
            : (numerator.value / denominator.value) * (rule.unit === "%" ? 100 : 1)
          : null;
      result.push({
        stableId: `${args.empireSlug}:${args.ticker}:${rule.id}:FY${current.year}:v1`,
        empireSlug: args.empireSlug,
        entityId: args.entityId,
        ticker: args.ticker,
        companyName: args.companyName,
        sector,
        metricId: rule.id,
        metricLabel: rule.label,
        period: `FY${current.year}`,
        asOf: current.asOf,
        unit: rule.unit,
        formula: rule.formula,
        ruleVersion: "v1",
        value,
        gap,
        inputs,
      });
    }
  }

  for (const fact of args.facts) {
    if (fact.kind !== "valuation_period") continue;
    if (!sectorTemplates[template].includes("reported_pe")) continue;
    result.push({
      stableId: `${args.empireSlug}:${args.ticker}:reported_pe:${fact.year}:v1`,
      empireSlug: args.empireSlug,
      entityId: args.entityId,
      ticker: args.ticker,
      companyName: args.companyName,
      sector,
      metricId: "reported_pe",
      metricLabel: "Reported P/E",
      period: String(fact.year),
      asOf: fact.asOf,
      unit: "x",
      formula: "Provider-reported P/E, no derived calculation",
      ruleVersion: "provider-value.v1",
      value: fact.pe,
      gap: fact.pe === null ? "Provider P/E unavailable" : null,
      inputs:
        fact.pe === null
          ? []
          : [
              {
                label: `${fact.year} P/E`,
                factId: fact.id,
                value: fact.pe,
                unit: "x",
                sourceRefs: fact.sourceRefs,
              },
            ],
    });
  }
  return result;
}
