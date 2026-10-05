import { v } from "convex/values";
import { ownerKey } from "../src/universe/owners.mjs";
import { query, type QueryCtx } from "./_generated/server";
import { ownerHolding, ownerRecord } from "./schema";
import { takeBounded } from "./readBounds";

const limits = { holders: 100, others: 4, holdings: 8 };
const holding = ownerHolding.pick("symbol", "percentage").extend({
  name: v.union(v.string(), v.null()),
});
const holder = ownerRecord.pick("key", "name", "listedSymbol").extend({
  kind: v.union(ownerRecord.fields.kind, v.null()),
  percentage: ownerHolding.fields.percentage,
  others: v.array(holding),
  otherCount: v.number(),
});

function byPercentage(a: { percentage: number | null }, b: { percentage: number | null }) {
  if (a.percentage === b.percentage) return 0;
  if (a.percentage === null) return 1;
  if (b.percentage === null) return -1;
  return b.percentage - a.percentage;
}

async function heldCompanies(
  ctx: QueryCtx,
  rows: { symbol: string; percentage: number | null }[],
  limit: number,
) {
  return Promise.all(
    [...rows]
      .sort((a, b) => byPercentage(a, b) || a.symbol.localeCompare(b.symbol))
      .slice(0, limit)
      .map(async ({ symbol, percentage }) => {
        const company = await ctx.db
          .query("companies")
          .withIndex("by_symbol", (index) => index.eq("symbol", symbol))
          .unique();
        return { symbol, name: company?.name ?? null, percentage };
      }),
  );
}

export const get = query({
  args: { symbol: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      symbol: v.string(),
      name: v.string(),
      holders: v.array(holder),
      holdings: v.array(holding),
      holdingCount: v.number(),
      ownerKey: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, { symbol }) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_symbol", (index) => index.eq("symbol", symbol.trim().toUpperCase()))
      .unique();
    if (!company) return null;

    const [rows, owner] = await Promise.all([
      takeBounded(
        ctx.db
          .query("holdings")
          .withIndex("by_symbol", (index) => index.eq("symbol", company.symbol)),
        limits.holders,
      ),
      ctx.db
        .query("owners")
        .withIndex("by_listed_symbol", (index) => index.eq("listedSymbol", company.symbol))
        .unique(),
    ]);
    const [holders, holdings] = await Promise.all([
      Promise.all(
        rows
          .filter(({ holderKind }) => holderKind === "entity")
          .map(({ holderName, percentage }) => ({
            key: ownerKey(holderName),
            name: holderName,
            percentage,
          }))
          .sort((a, b) => byPercentage(a, b) || a.key.localeCompare(b.key))
          .map(async ({ key, name, percentage }) => {
            const holderOwner = await ctx.db
              .query("owners")
              .withIndex("by_key", (index) => index.eq("key", key))
              .unique();
            const others = (holderOwner?.holdings ?? []).filter(
              (row) => row.symbol !== company.symbol,
            );
            return {
              key,
              name,
              kind: holderOwner?.kind ?? null,
              listedSymbol: holderOwner?.listedSymbol ?? null,
              percentage,
              others: await heldCompanies(ctx, others, limits.others),
              otherCount: others.length,
            };
          }),
      ),
      heldCompanies(ctx, owner?.holdings ?? [], limits.holdings),
    ]);

    return {
      symbol: company.symbol,
      name: company.name,
      holders,
      holdings,
      holdingCount: owner?.holdings.length ?? 0,
      ownerKey: owner?.key ?? null,
    };
  },
});
