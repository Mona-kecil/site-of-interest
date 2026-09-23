import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { deriveCycleState, type CycleState } from "../company/company-model";

type Board = NonNullable<FunctionReturnType<typeof api.focus.getBoard>>;
export type FocusRow = Board["rows"][number];
export type FocusSort = "priority" | "ticker" | "pe" | "revenue" | "earnings" | "cash_flow";

export function peerPremium(row: FocusRow): number | null {
  const pe = row.pe?.value;
  const peerPe = row.peerPe?.value;
  if (pe === undefined || peerPe === undefined || pe <= 0 || peerPe <= 0) return null;
  return (pe / peerPe - 1) * 100;
}

export function focusGaps(row: FocusRow): string[] {
  const gaps: string[] = [];
  if (row.pe === null) gaps.push("P/E not returned");
  if (row.peerPe === null) gaps.push("Peer P/E not returned");
  else if (row.peerPe.value <= 0) gaps.push("Peer premium: peer P/E is zero or negative");
  if (row.pe !== null && row.pe.value <= 0 && row.peerPe !== null && row.peerPe.value > 0) {
    gaps.push("Peer premium: company P/E is zero or negative");
  }
  if (row.revenueGrowth === null) gaps.push("Quarterly revenue growth not returned");
  if (row.earningsGrowth === null) gaps.push("Quarterly earnings growth not returned");
  if (row.freeCashFlow === null) gaps.push("Annual free cash flow not returned");
  return gaps;
}

export function focusCycle(row: FocusRow): CycleState {
  return deriveCycleState(row.revenueGrowth?.value ?? null, row.earningsGrowth?.value ?? null);
}

function growthDivergence(row: FocusRow): number {
  if (row.revenueGrowth === null || row.earningsGrowth === null) return 0;
  return Math.abs(row.revenueGrowth.value - row.earningsGrowth.value);
}

export function orderFocusRows(
  rows: ReadonlyArray<FocusRow>,
  options: { sort: FocusSort; cycle: CycleState | "all"; incompleteOnly: boolean },
): FocusRow[] {
  const filtered = rows.filter(
    (row) =>
      (options.cycle === "all" || focusCycle(row) === options.cycle) &&
      (!options.incompleteOnly || focusGaps(row).length > 0),
  );
  return filtered.sort((left, right) => {
    if (options.sort === "priority") {
      const gapDifference = focusGaps(right).length - focusGaps(left).length;
      if (gapDifference !== 0) return gapDifference;
      const divergence = growthDivergence(right) - growthDivergence(left);
      if (divergence !== 0) return divergence;
    }
    if (options.sort === "pe") {
      const difference = (right.pe?.value ?? -Infinity) - (left.pe?.value ?? -Infinity);
      if (difference !== 0) return difference;
    }
    if (options.sort === "revenue" || options.sort === "earnings" || options.sort === "cash_flow") {
      const key =
        options.sort === "revenue"
          ? "revenueGrowth"
          : options.sort === "earnings"
            ? "earningsGrowth"
            : "freeCashFlow";
      const difference = (right[key]?.value ?? -Infinity) - (left[key]?.value ?? -Infinity);
      if (difference !== 0) return difference;
    }
    return left.ticker.localeCompare(right.ticker);
  });
}

export function priorityReason(row: FocusRow): string {
  const gaps = focusGaps(row);
  if (gaps.length > 0)
    return `${gaps.length} unresolved board ${gaps.length === 1 ? "gap" : "gaps"}`;
  return `${growthDivergence(row).toFixed(1)} percentage points between reported growth values`;
}
