import { v } from "convex/values";
import { definitions } from "../src/universe/checks.mjs";
import { query } from "./_generated/server";
import { takeBounded } from "./readBounds";
import schema from "./schema";

// Import validation allows one row per symbol and period: YEARS and QUARTERS in fields.mjs.
const limits = { years: 7, quarters: 8, holdings: 100, checks: definitions.length, peers: 1000 };

export const get = query({
  args: { symbol: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      company: schema.doc("companies"),
      years: v.array(schema.doc("companyYears")),
      quarters: v.array(schema.doc("companyQuarters")),
      holdings: v.array(schema.doc("holdings")),
      checks: v.array(schema.doc("checkResults")),
      sources: v.array(
        schema.doc("universeSources").pick("id", "title", "endpoint", "retrievedAt"),
      ),
      peers: v.array(
        v.object({
          checkId: v.string(),
          values: v.array(v.object({ symbol: v.string(), value: v.union(v.number(), v.null()) })),
        }),
      ),
    }),
  ),
  handler: async (ctx, { symbol }) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_symbol", (index) => index.eq("symbol", symbol.trim().toUpperCase()))
      .unique();
    if (!company) return null;
    const [years, quarters, holdings, checks, peers] = await Promise.all([
      takeBounded(
        ctx.db
          .query("companyYears")
          .withIndex("by_symbol_and_year", (index) => index.eq("symbol", company.symbol)),
        limits.years,
      ),
      takeBounded(
        ctx.db
          .query("companyQuarters")
          .withIndex("by_symbol_and_quarter", (index) => index.eq("symbol", company.symbol)),
        limits.quarters,
      ),
      takeBounded(
        ctx.db
          .query("holdings")
          .withIndex("by_symbol", (index) => index.eq("symbol", company.symbol)),
        limits.holdings,
      ),
      takeBounded(
        ctx.db
          .query("checkResults")
          .withIndex("by_symbol", (index) => index.eq("symbol", company.symbol)),
        limits.checks,
      ),
      takeBounded(
        ctx.db
          .query("companies")
          .withIndex("by_sub_sector", (index) => index.eq("subSector", company.subSector)),
        limits.peers,
      ),
    ]);
    const sourceIds = [
      ...new Set([
        ...[company, ...years, ...quarters].flatMap((row) => Object.values(row.sourceIds)),
        ...holdings.map((row) => row.sourceId),
        ...checks.flatMap((row) => row.inputs.map((input) => input.sourceId)),
      ]),
    ];
    const sources = await Promise.all(
      sourceIds.map(async (id) => {
        const source = await ctx.db
          .query("universeSources")
          .withIndex("by_source_id", (index) => index.eq("id", id))
          .unique();
        if (!source) throw new Error(`Company profile source unavailable: ${id}`);
        return {
          id: source.id,
          title: source.title,
          endpoint: source.endpoint,
          retrievedAt: source.retrievedAt,
        };
      }),
    );
    return {
      company,
      years,
      quarters,
      holdings,
      checks,
      sources,
      peers: company.checks.map(({ checkId }) => ({
        checkId,
        values: peers.map((peer) => ({
          symbol: peer.symbol,
          value: peer.checks.find((check) => check.checkId === checkId)?.value ?? null,
        })),
      })),
    };
  },
});
