import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import type { CheckDefinition } from "../../universe/checks.mjs";

export type ScreenRow = FunctionReturnType<typeof api.universe.screen>[number];
export type CheckSummary = ScreenRow["checks"][number];
export type Filters = { search: string; sector: string; subSector: string; index: string };
export type Sort = { column: string; direction: "asc" | "desc" };
export const UNREPORTED = "__unreported__";
export const lenses = [
  { label: "Cash", checks: ["cash_conversion", "fcf_yield", "reinvestment_rate"] },
  { label: "Returns", checks: ["roic", "roe", "revenue_cagr"] },
  {
    label: "Balance sheet",
    checks: ["interest_coverage", "net_debt_to_ebitda", "current_ratio", "share_dilution"],
  },
  { label: "Price", checks: ["pe_vs_history", "pb_vs_history", "dividend_years"] },
  { label: "Owners", checks: ["free_float", "largest_holder"] },
  {
    label: "Banks",
    checks: ["npl_ratio", "loan_to_deposit", "capital_adequacy", "net_interest_margin"],
  },
] as const;

export function summaryFor(row: ScreenRow, checkId: string): CheckSummary | undefined {
  return row.checks.find((check) => check.checkId === checkId);
}

function matches(filter: string, value: string | null) {
  return !filter || (filter === UNREPORTED ? value === null : filter === value);
}

function columnValue(row: ScreenRow, column: string): string | number | null {
  if (column === "symbol" || column === "name" || column === "subSector" || column === "marketCap")
    return row[column];
  return summaryFor(row, column)?.value ?? null;
}

export function screenRows(rows: readonly ScreenRow[], filters: Filters, sort: Sort): ScreenRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows
    .filter(
      (row) =>
        (!search ||
          row.symbol.toLowerCase().includes(search) ||
          row.name.toLowerCase().includes(search)) &&
        matches(filters.sector, row.sector) &&
        matches(filters.subSector, row.subSector) &&
        (!filters.index ||
          (filters.index === UNREPORTED
            ? row.indices === null
            : row.indices?.includes(filters.index))),
    )
    .sort((a, b) => {
      const left = columnValue(a, sort.column);
      const right = columnValue(b, sort.column);
      if (left === null || right === null) {
        if (left === null && right !== null) return 1;
        if (left !== null && right === null) return -1;
        return a.symbol.localeCompare(b.symbol);
      }
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return comparison * (sort.direction === "asc" ? 1 : -1) || a.symbol.localeCompare(b.symbol);
    });
}

export function filterOptions(
  rows: readonly ScreenRow[],
  field: "sector" | "subSector" | "indices",
) {
  const values = rows.flatMap((row) =>
    field === "indices" ? (row.indices ?? [null]) : [row[field]],
  );
  const reported = [...new Set(values.filter((value): value is string => value !== null))].sort();
  return [
    ...reported.map((value) => ({ value, label: value })),
    ...(values.includes(null) ? [{ value: UNREPORTED, label: "Not reported" }] : []),
  ];
}

export function formatValue(value: number | null, unit: CheckDefinition["unit"]) {
  if (value === null) return "n/a";
  if (unit === "percent")
    return new Intl.NumberFormat("en", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  if (unit === "multiple")
    return `${new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}×`;
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

export function formatMarketCap(value: number | null) {
  return value === null
    ? "n/a"
    : `IDR ${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value)}`;
}

export function formatInput(value: number | null) {
  return value === null
    ? "Not reported"
    : new Intl.NumberFormat("en", { maximumFractionDigits: 12 }).format(value);
}

export function formatPeers(percentile: number | null, peerCount: number) {
  return `${percentile === null ? "p n/a" : `p${Math.round(percentile * 100)}`} · ${peerCount} peers`;
}
