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
export const kindLabels = {
  company: "Listed company",
  holder: "Not listed",
  bucket: "Pooled holders",
};

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
