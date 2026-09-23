import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { deriveCycleState, type CycleState } from "../company/company-model";

export type FundamentalBoardData = NonNullable<
  FunctionReturnType<typeof api.focus.getFundamentals>
>;
export type FundamentalRow = FundamentalBoardData["rows"][number];
export type FundamentalSort = "priority" | "ticker" | "pe" | "revenue" | "earnings" | "cash_flow";

export function peerPremium(row: FundamentalRow): number | null {
  const pe = row.fundamentals.pe?.value;
  const peerPe = row.fundamentals.peerPe?.value;
  if (pe === undefined || peerPe === undefined || pe <= 0 || peerPe <= 0) return null;
  return (pe / peerPe - 1) * 100;
}

export function fundamentalGaps(row: FundamentalRow): string[] {
  const gaps: string[] = [];
  const { pe, peerPe, revenueGrowth, earningsGrowth, freeCashFlow } = row.fundamentals;
  if (pe === null) gaps.push("P/E not returned");
  if (peerPe === null) gaps.push("Peer P/E not returned");
  else if (peerPe.value <= 0) gaps.push("Peer premium: peer P/E is zero or negative");
  if (pe !== null && pe.value <= 0 && peerPe !== null && peerPe.value > 0) {
    gaps.push("Peer premium: company P/E is zero or negative");
  }
  if (revenueGrowth === null) gaps.push("Quarterly revenue growth not returned");
  if (earningsGrowth === null) gaps.push("Quarterly earnings growth not returned");
  if (freeCashFlow === null) gaps.push("Annual free cash flow not returned");
  return gaps;
}

export function fundamentalCycle(row: FundamentalRow): CycleState {
  return deriveCycleState(
    row.fundamentals.revenueGrowth?.value ?? null,
    row.fundamentals.earningsGrowth?.value ?? null,
  );
}

function growthDivergence(row: FundamentalRow): number {
  const { revenueGrowth, earningsGrowth } = row.fundamentals;
  if (revenueGrowth === null || earningsGrowth === null) return 0;
  return Math.abs(revenueGrowth.value - earningsGrowth.value);
}

export function orderFundamentalRows(
  rows: ReadonlyArray<FundamentalRow>,
  options: { sort: FundamentalSort; cycle: CycleState | "all"; incompleteOnly: boolean },
): FundamentalRow[] {
  const filtered = rows.filter(
    (row) =>
      (options.cycle === "all" || fundamentalCycle(row) === options.cycle) &&
      (!options.incompleteOnly || fundamentalGaps(row).length > 0),
  );
  return filtered.sort((left, right) => {
    if (options.sort === "priority") {
      const gapDifference = fundamentalGaps(right).length - fundamentalGaps(left).length;
      if (gapDifference !== 0) return gapDifference;
      const divergence = growthDivergence(right) - growthDivergence(left);
      if (divergence !== 0) return divergence;
    }
    if (options.sort === "pe") {
      const difference =
        (right.fundamentals.pe?.value ?? -Infinity) - (left.fundamentals.pe?.value ?? -Infinity);
      if (difference !== 0) return difference;
    }
    if (options.sort === "revenue" || options.sort === "earnings" || options.sort === "cash_flow") {
      const key =
        options.sort === "revenue"
          ? "revenueGrowth"
          : options.sort === "earnings"
            ? "earningsGrowth"
            : "freeCashFlow";
      const difference =
        (right.fundamentals[key]?.value ?? -Infinity) -
        (left.fundamentals[key]?.value ?? -Infinity);
      if (difference !== 0) return difference;
    }
    return left.ticker.localeCompare(right.ticker);
  });
}

export function fundamentalPriorityReason(row: FundamentalRow): string {
  const gaps = fundamentalGaps(row);
  if (gaps.length > 0)
    return `${gaps.length} unresolved board ${gaps.length === 1 ? "gap" : "gaps"}`;
  return `${growthDivergence(row).toFixed(1)} percentage points between reported growth values`;
}
