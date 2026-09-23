export interface FinancialPoint {
  year: number;
  revenue: number;
  earnings: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  totalDebt?: number;
  unit: string;
  sourceRefs: ReadonlyArray<{ sourceId: string; locator: string }>;
}

export type CycleState =
  | "both_growing"
  | "revenue_growing"
  | "earnings_growing"
  | "neither_growing"
  | "incomplete";

export const cycleLabels: Record<CycleState, string> = {
  both_growing: "Both growing",
  revenue_growing: "Revenue growing",
  earnings_growing: "Earnings growing",
  neither_growing: "Neither growing",
  incomplete: "Growth data incomplete",
};

export function deriveCycleState(
  revenueGrowth: number | null,
  earningsGrowth: number | null,
): CycleState {
  if (revenueGrowth === null || earningsGrowth === null) return "incomplete";
  if (revenueGrowth > 0 && earningsGrowth > 0) return "both_growing";
  if (revenueGrowth > 0) return "revenue_growing";
  if (earningsGrowth > 0) return "earnings_growing";
  return "neither_growing";
}

type AnnualMetric = "revenue" | "earnings" | "operatingCashFlow" | "freeCashFlow" | "totalDebt";

const annualMetrics: ReadonlyArray<{ key: AnnualMetric; label: string }> = [
  { key: "revenue", label: "Revenue" },
  { key: "earnings", label: "Earnings" },
  { key: "operatingCashFlow", label: "Operating cash flow" },
  { key: "freeCashFlow", label: "Free cash flow" },
  { key: "totalDebt", label: "Total debt" },
];

export interface AnnualComparison {
  metric: AnnualMetric;
  label: string;
  currentYear: number;
  previousYear: number;
  current: number | null;
  previous: number | null;
  change: number | null;
  changePercent: number | null;
  unit: string;
  formula: "(current - previous) / abs(previous) × 100";
  sourceRefs: ReadonlyArray<{ sourceId: string; locator: string }>;
}

export function deriveAnnualComparisons(
  financials: ReadonlyArray<FinancialPoint>,
): AnnualComparison[] {
  const current = financials.at(-1);
  const previous = financials.at(-2);
  if (current === undefined || previous === undefined) return [];

  return annualMetrics.map(({ key, label }) => {
    const currentValue = current[key] ?? null;
    const previousValue = previous[key] ?? null;
    const change =
      currentValue !== null && previousValue !== null ? currentValue - previousValue : null;
    return {
      metric: key,
      label,
      currentYear: current.year,
      previousYear: previous.year,
      current: currentValue,
      previous: previousValue,
      change,
      changePercent:
        change !== null && previousValue !== null && previousValue !== 0
          ? (change / Math.abs(previousValue)) * 100
          : null,
      unit: current.unit,
      formula: "(current - previous) / abs(previous) × 100",
      sourceRefs: [...current.sourceRefs, ...previous.sourceRefs],
    };
  });
}

export function formatCompanyValue(value: number, unit: string): string {
  const compact = (amount: number) => Number(amount.toFixed(2)).toString();
  if (unit === "IDR") {
    const sign = value < 0 ? "−" : "";
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000_000_000) return `${sign}Rp${compact(absolute / 1_000_000_000_000)}tn`;
    if (absolute >= 1_000_000_000) return `${sign}Rp${compact(absolute / 1_000_000_000)}bn`;
    if (absolute >= 1_000_000) return `${sign}Rp${compact(absolute / 1_000_000)}m`;
    return `${sign}Rp${absolute.toLocaleString("en-US")}`;
  }
  if (unit === "IDR_per_share") return `Rp${value.toLocaleString("en-US")}`;
  if (unit === "percent") return `${compact(value)}%`;
  if (unit === "multiple") return `${compact(value)}×`;
  return value.toLocaleString("en-US");
}
