import { v } from "convex/values";
import { ownerKey } from "../src/universe/owners.mjs";
import { query, type QueryCtx } from "./_generated/server";
import { businessGroup, ownerHolding, ownerRecord, universeCheckSummary } from "./schema";

const nullableNumber = v.union(v.number(), v.null());
const nullableText = v.union(v.string(), v.null());
const summary = ownerRecord.omit("holdings").extend({ largestHolderCount: v.number() });
const entityHolder = ownerHolding.omit("symbol").extend({ key: v.string(), name: v.string() });
const member = v.object({
  symbol: v.string(),
  name: v.string(),
  subSector: nullableText,
  marketCap: nullableNumber,
  freeFloat: nullableNumber,
  checks: v.array(universeCheckSummary),
});

function bounded<T>(rows: T[], limit: number, label: string): T[] {
  if (rows.length > limit) throw new Error(`${label} exceeds ${limit} rows`);
  return rows;
}

async function company(ctx: QueryCtx, symbol: string) {
  return ctx.db
    .query("companies")
    .withIndex("by_symbol", (index) => index.eq("symbol", symbol))
    .unique();
}

async function companyHoldings(ctx: QueryCtx, symbol: string) {
  return bounded(
    await ctx.db
      .query("holdings")
      .withIndex("by_symbol", (index) => index.eq("symbol", symbol))
      .take(65),
    64,
    "Company holdings",
  );
}

async function entityHolders(ctx: QueryCtx, symbol: string) {
  const rows = (await companyHoldings(ctx, symbol)).filter(
    ({ holderKind }) => holderKind === "entity",
  );
  return rows
    .map(({ holderName, percentage, shares, value, sourceId }) => {
      const rank =
        percentage === null
          ? null
          : 1 + rows.filter((row) => row.percentage !== null && row.percentage > percentage).length;
      return {
        key: ownerKey(holderName),
        name: holderName,
        percentage,
        shares,
        value,
        sourceId,
        rank,
        isLargest: rank === 1,
      };
    })
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.key.localeCompare(b.key));
}

export const list = query({
  args: {},
  returns: v.array(summary),
  handler: async (ctx) => {
    const rows = bounded(
      await ctx.db.query("owners").withIndex("by_key").take(5001),
      5000,
      "Owner index",
    );
    return rows.map(({ key, name, kind, listedSymbol, holdings, companyCount, totalValue }) => ({
      key,
      name,
      kind,
      listedSymbol,
      companyCount,
      totalValue,
      largestHolderCount: new Set(
        holdings.filter(({ isLargest }) => isLargest).map(({ symbol }) => symbol),
      ).size,
    }));
  },
});

export const get = query({
  args: { key: v.string() },
  returns: v.union(
    v.null(),
    ownerRecord.extend({
      holdings: v.array(
        ownerHolding.extend({
          name: nullableText,
          subSector: nullableText,
          marketCap: nullableNumber,
          coHolders: v.array(entityHolder),
        }),
      ),
      ownHolders: v.array(entityHolder),
    }),
  ),
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("owners")
      .withIndex("by_key", (index) => index.eq("key", ownerKey(key)))
      .unique();
    if (!row) return null;
    const holdings = await Promise.all(
      bounded(row.holdings, 128, "Owner holdings").map(async (holding) => {
        const [held, holders] = await Promise.all([
          company(ctx, holding.symbol),
          entityHolders(ctx, holding.symbol),
        ]);
        return {
          ...holding,
          name: held?.name ?? null,
          subSector: held?.subSector ?? null,
          marketCap: held?.current.marketCap ?? null,
          coHolders: holders.filter((holder) => holder.key !== row.key),
        };
      }),
    );
    return {
      key: row.key,
      name: row.name,
      kind: row.kind,
      listedSymbol: row.listedSymbol,
      companyCount: row.companyCount,
      totalValue: row.totalValue,
      holdings,
      ownHolders: row.listedSymbol ? await entityHolders(ctx, row.listedSymbol) : [],
    };
  },
});

export const forCompany = query({
  args: { symbol: v.string() },
  returns: v.array(
    v.object({
      holderName: v.string(),
      holderKey: v.string(),
      holderKind: v.union(v.literal("entity"), v.literal("public"), v.literal("treasury")),
      ownerKey: nullableText,
      percentage: nullableNumber,
      shares: nullableNumber,
      value: nullableNumber,
      sourceId: v.string(),
    }),
  ),
  handler: async (ctx, { symbol }) =>
    (await companyHoldings(ctx, symbol.toUpperCase())).map(
      ({ holderName, holderKey, holderKind, percentage, shares, value, sourceId }) => ({
        holderName,
        holderKey,
        holderKind,
        ownerKey: holderKind === "entity" ? ownerKey(holderName) : null,
        percentage,
        shares,
        value,
        sourceId,
      }),
    ),
});

export const groups = query({
  args: {},
  returns: v.array(businessGroup),
  handler: async (ctx) => {
    const rows = bounded(
      await ctx.db.query("businessGroups").withIndex("by_slug").take(129),
      128,
      "Business groups",
    );
    return rows.map(({ slug, label, symbols, totalMarketCap }) => ({
      slug,
      label,
      symbols,
      totalMarketCap,
    }));
  },
});

export const group = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), businessGroup.extend({ members: v.array(member) })),
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("businessGroups")
      .withIndex("by_slug", (index) => index.eq("slug", slug))
      .unique();
    if (!row) return null;
    const members = await Promise.all(
      bounded(row.symbols, 1024, "Group members").map(async (symbol) => {
        const held = await company(ctx, symbol);
        return {
          symbol,
          name: held?.name ?? symbol,
          subSector: held?.subSector ?? null,
          marketCap: held?.current.marketCap ?? null,
          freeFloat: held?.current.freeFloat ?? null,
          checks: held?.checks ?? [],
        };
      }),
    );
    return {
      slug: row.slug,
      label: row.label,
      symbols: row.symbols,
      totalMarketCap: row.totalMarketCap,
      members,
    };
  },
});
