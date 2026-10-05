import { v } from "convex/values";
import { definitions } from "../src/universe/checks.mjs";
import { query } from "./_generated/server";
import { takeBounded } from "./readBounds";
import { universeCheckInput, universeCheckResult, universeCheckSummary } from "./schema";

// The IDX lists about 960 companies; the cap keeps the screener read bounded.
const maxCompanies = 1500;
const nullableNumber = v.union(v.number(), v.null());
const nullableText = v.union(v.string(), v.null());
const definition = v.object({
  id: v.string(),
  label: v.string(),
  question: v.string(),
  unit: v.union(v.literal("percent"), v.literal("multiple"), v.literal("count")),
  formula: v.string(),
  appliesTo: v.union(v.literal("nonFinancial"), v.literal("bank"), v.literal("all")),
});
const source = v.object({
  id: v.string(),
  title: v.string(),
  endpoint: v.string(),
  retrievedAt: v.string(),
});

export const screen = query({
  args: {},
  returns: v.array(
    v.object({
      symbol: v.string(),
      name: v.string(),
      sector: nullableText,
      subSector: nullableText,
      indices: v.union(v.array(v.string()), v.null()),
      marketCap: nullableNumber,
      freeFloat: nullableNumber,
      peTtm: nullableNumber,
      checks: v.array(universeCheckSummary),
    }),
  ),
  handler: async (ctx) => {
    const companies = await takeBounded(
      ctx.db.query("companies").withIndex("by_symbol"),
      maxCompanies,
    );
    return companies.map((company) => ({
      symbol: company.symbol,
      name: company.name,
      sector: company.sector,
      subSector: company.subSector,
      indices: company.indices,
      marketCap: company.current.marketCap ?? null,
      freeFloat: company.current.freeFloat ?? null,
      peTtm: company.current.peTtm ?? null,
      checks: company.checks,
    }));
  },
});

export const check = query({
  args: { symbol: v.string(), checkId: v.string() },
  returns: v.union(
    v.null(),
    universeCheckResult.extend({
      definition,
      inputs: v.array(universeCheckInput.extend({ source: v.union(source, v.null()) })),
    }),
  ),
  handler: async (ctx, { symbol, checkId }) => {
    const selectedDefinition = definitions.find(({ id }) => id === checkId);
    if (!selectedDefinition) return null;
    const rows = await takeBounded(
      ctx.db
        .query("checkResults")
        .withIndex("by_symbol", (index) => index.eq("symbol", symbol.toUpperCase())),
      definitions.length,
    );
    const row = rows.find((result) => result.checkId === checkId);
    if (!row) return null;
    const sources = await Promise.all(
      [...new Set(row.inputs.map(({ sourceId }) => sourceId))].map(async (sourceId) => {
        const document = await ctx.db
          .query("universeSources")
          .withIndex("by_source_id", (index) => index.eq("id", sourceId))
          .unique();
        return [
          sourceId,
          document
            ? {
                id: document.id,
                title: document.title,
                endpoint: document.endpoint,
                retrievedAt: document.retrievedAt,
              }
            : null,
        ] as const;
      }),
    );
    const byId = new Map(sources);
    const { _id, _creationTime, ...result } = row;
    return {
      ...result,
      definition: selectedDefinition,
      inputs: row.inputs.map((input) => ({ ...input, source: byId.get(input.sourceId) ?? null })),
    };
  },
});
