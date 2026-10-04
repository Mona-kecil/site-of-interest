import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { ownerKey } from "../../universe/owners.mjs";

export type OwnerSummary = FunctionReturnType<typeof api.owners.list>[number];
export type Owner = NonNullable<FunctionReturnType<typeof api.owners.get>>;
export type OwnerSort = {
  column: "name" | "kind" | "companyCount" | "totalValue" | "largestHolderCount";
  direction: "asc" | "desc";
};
export const defaultSort: OwnerSort = { column: "companyCount", direction: "desc" };
export const kindLabels = { company: "Listed company", holder: "Holder", bucket: "Bucket label" };

export function ownerRows(
  rows: readonly OwnerSummary[],
  search: string,
  listedOnly: boolean,
  sort: OwnerSort = defaultSort,
) {
  const query = ownerKey(search.trim());
  const text = search.trim().toLowerCase();
  return rows
    .filter(
      (row) =>
        (!listedOnly || row.kind === "company") &&
        (!text ||
          row.name.toLowerCase().includes(text) ||
          (query && row.key.includes(query)) ||
          row.listedSymbol?.toLowerCase().includes(text)),
    )
    .sort((a, b) => {
      const left = a[sort.column];
      const right = b[sort.column];
      if (left === null || right === null)
        return left === right ? a.key.localeCompare(b.key) : left === null ? 1 : -1;
      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return order * (sort.direction === "asc" ? 1 : -1) || a.key.localeCompare(b.key);
    });
}

export type GraphNode = {
  id: string;
  label: string;
  role: "upstream" | "owner" | "company";
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type GraphEdge = { id: string; from: string; to: string; percentages: (number | null)[] };

export function ownershipGraph(owner: Pick<Owner, "key" | "name" | "holdings" | "ownHolders">) {
  const upper = new Map<string, { name: string; percentages: (number | null)[] }>();
  for (const holder of owner.ownHolders) {
    if (!upper.has(holder.key)) upper.set(holder.key, { name: holder.name, percentages: [] });
    if (holder.name < upper.get(holder.key)!.name) upper.get(holder.key)!.name = holder.name;
    upper.get(holder.key)!.percentages.push(holder.percentage);
  }
  const held = new Map<string, (number | null)[]>();
  for (const holding of owner.holdings) {
    if (!held.has(holding.symbol)) held.set(holding.symbol, []);
    held.get(holding.symbol)!.push(holding.percentage);
  }
  const count = Math.max(upper.size, held.size, 1);
  const height = count * 92 + 48;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const center = `owner:${owner.key}`;
  const ownerX = upper.size ? 364 : 24;
  const node = (
    id: string,
    label: string,
    role: GraphNode["role"],
    href: string,
    x: number,
    y: number,
  ) => nodes.push({ id, label, role, href, x, y, width: 264, height: 56 });
  node(
    center,
    owner.name,
    "owner",
    `/owner/${encodeURIComponent(owner.key)}`,
    ownerX,
    (height - 56) / 2,
  );
  const top = (size: number) => (height - ((size - 1) * 92 + 56)) / 2;
  [...upper]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, holder], index) => {
      const id = `upstream:${key}`;
      node(
        id,
        holder.name,
        "upstream",
        `/owner/${encodeURIComponent(key)}`,
        24,
        top(upper.size) + index * 92,
      );
      edges.push({
        id,
        from: id,
        to: center,
        percentages: [...holder.percentages].sort(comparePercentages),
      });
    });
  [...held]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([symbol, percentages], index) => {
      const id = `company:${symbol}`;
      node(
        id,
        symbol,
        "company",
        `/company/${encodeURIComponent(symbol)}`,
        ownerX + 340,
        top(held.size) + index * 92,
      );
      edges.push({
        id,
        from: center,
        to: id,
        percentages: [...percentages].sort(comparePercentages),
      });
    });
  return { width: upper.size ? 992 : held.size ? 652 : 312, height, nodes, edges };
}

function comparePercentages(a: number | null, b: number | null) {
  return a === b ? 0 : a === null ? 1 : b === null ? -1 : b - a;
}

export function graphLines(label: string): string[] {
  if (label.length <= 32) return [label];
  const boundary = label.lastIndexOf(" ", 32);
  const split = boundary > 10 ? boundary : 32;
  const remaining = label.slice(split).trim();
  return [label.slice(0, split), remaining.length <= 32 ? remaining : `${remaining.slice(0, 31)}…`];
}
