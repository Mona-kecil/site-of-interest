import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import manifest from "../../../data/universe/manifest.json";
import {
  applies,
  definitions,
  financialSubSectors,
  type CheckDefinition,
} from "../../universe/checks.mjs";
import { lenses } from "../universe/universe-model";

export type CompanyProfile = NonNullable<FunctionReturnType<typeof api.companyProfile.get>>;
export type ProfileCheck = CompanyProfile["checks"][number];
export type Peer = CompanyProfile["peers"][number]["values"][number];
type Values = { values: Record<string, number | null> };
export type SeriesField = { key: string; label: string; unit: "IDR" | "multiple" };
export type ProfileSection = {
  id: string;
  label: string;
  checks: CheckDefinition[];
  series: SeriesField[];
};

const money = (key: string, label: string): SeriesField => ({ key, label, unit: "IDR" });
const history: Record<string, SeriesField[]> = {
  Cash: [
    money("earnings", "Earnings"),
    money("operatingCashFlow", "Operating cash flow (CFO)"),
    money("freeCashFlow", "Free cash flow (FCF)"),
    money("capitalExpenditure", "Capex"),
  ],
  Returns: [
    money("revenue", "Revenue"),
    money("ebit", "EBIT"),
    money("totalEquity", "Total equity"),
  ],
  "Balance sheet": [
    money("totalDebt", "Total debt"),
    money("cashAndEquivalents", "Cash and equivalents"),
    money("totalEquity", "Total equity"),
  ],
  Price: [
    { key: "pe", label: "P/E", unit: "multiple" },
    { key: "pb", label: "P/B", unit: "multiple" },
    money("totalDividend", "Total dividend"),
  ],
  Owners: [],
  Banks: [
    money("grossLoan", "Gross loans"),
    money("nonPerformingLoan", "Non-performing loans (NPL)"),
  ],
};
export const quarterFields = [
  money("revenueQ", "Revenue"),
  money("earningsQ", "Earnings"),
  money("operatingCashFlowQ", "CFO"),
  money("freeCashFlowQ", "FCF"),
];
export const annualPeriods = manifest.years;
export const quarterPeriods = manifest.quarters;

export function assembleSections(company: { subSector: string | null }) {
  const applicable = definitions.filter((check) => applies(check, company));
  const sections: ProfileSection[] = lenses.flatMap((lens) => {
    const checks = lens.checks.flatMap((id) => applicable.filter((check) => check.id === id));
    return checks.length
      ? [
          {
            id: lens.label.toLowerCase().replaceAll(" ", "-"),
            label: lens.label === "Price" ? "Price against own history" : lens.label,
            checks,
            series: history[lens.label],
          },
        ]
      : [];
  });
  const note =
    company.subSector !== "Banks" && financialSubSectors.has(company.subSector ?? "")
      ? `Non-financial checks do not apply to its sub-sector (${company.subSector}).`
      : null;
  return { sections, note };
}

export function extractSeries<P extends string | number>(
  rows: readonly (Values & { year?: number; quarter?: string })[],
  periods: readonly P[],
  fields: readonly SeriesField[],
) {
  const byPeriod = new Map(rows.map((row) => [row.year ?? row.quarter, row.values]));
  return periods.map((period) => ({
    period,
    values: fields.map(({ key }) => byPeriod.get(period)?.[key] ?? null),
  }));
}

export function peerStrip(peers: readonly Peer[], symbol: string) {
  const reported = peers.filter((peer): peer is Peer & { value: number } => peer.value !== null);
  const ordered = [...reported].sort((a, b) => a.value - b.value);
  const positions = new Map<number, number>();
  for (let start = 0; start < ordered.length;) {
    let end = start + 1;
    while (end < ordered.length && ordered[end].value === ordered[start].value) end++;
    positions.set(
      ordered[start].value,
      ordered.length === 1 ? 0.5 : (start + (end - start - 1) / 2) / (ordered.length - 1),
    );
    start = end;
  }
  return {
    points: reported.map((peer) => ({
      ...peer,
      position: positions.get(peer.value)!,
      selected: peer.symbol === symbol,
    })),
    missing: peers.filter(({ value }) => value === null).map(({ symbol: ticker }) => ticker),
  };
}

export function formatIdrAmount(value: number | null) {
  return value === null
    ? "Not reported"
    : new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        value / 1e9,
      );
}

export function formatIdr(value: number | null) {
  return value === null ? "Not reported" : `IDR ${formatIdrAmount(value)} bn`;
}

export function orderHoldings<
  T extends {
    holderKind: "entity" | "public" | "treasury";
    holderName: string;
    percentage: number | null;
  },
>(holdings: readonly T[]): T[] {
  const order = { entity: 0, public: 1, treasury: 2 };
  return [...holdings].sort(
    (a, b) =>
      order[a.holderKind] - order[b.holderKind] ||
      (a.percentage === null && b.percentage === null
        ? 0
        : a.percentage === null
          ? 1
          : b.percentage === null
            ? -1
            : b.percentage - a.percentage) ||
      a.holderName.localeCompare(b.holderName),
  );
}
