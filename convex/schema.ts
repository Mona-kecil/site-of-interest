import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const universeNumber = v.union(v.number(), v.null());
const universeText = v.union(v.string(), v.null());
const universeList = v.union(v.array(v.string()), v.null());
const universeSourceIds = v.record(v.string(), v.string());
const universeValues = v.record(v.string(), universeNumber);

export const universeCheckSummary = v.object({
  checkId: v.string(),
  value: universeNumber,
  percentile: universeNumber,
  peerCount: v.number(),
  gap: universeText,
});

export const universeCheckInput = v.object({
  key: v.string(),
  field: v.string(),
  period: v.string(),
  value: universeNumber,
  sourceId: v.string(),
  label: v.optional(v.string()),
});

export const universeCheckResult = universeCheckSummary.extend({
  symbol: v.string(),
  subSector: universeText,
  period: v.string(),
  inputs: v.array(universeCheckInput),
});

export const ownerHolding = v.object({
  symbol: v.string(),
  percentage: universeNumber,
  shares: universeNumber,
  value: universeNumber,
  rank: universeNumber,
  isLargest: v.boolean(),
  sourceId: v.string(),
});

export const ownerRecord = v.object({
  key: v.string(),
  name: v.string(),
  kind: v.union(v.literal("company"), v.literal("bucket"), v.literal("holder")),
  listedSymbol: universeText,
  holdings: v.array(ownerHolding),
  companyCount: v.number(),
  totalValue: universeNumber,
});

export const businessGroup = v.object({
  slug: v.string(),
  label: v.string(),
  symbols: v.array(v.string()),
  totalMarketCap: universeNumber,
});

export default defineSchema({
  companies: defineTable({
    symbol: v.string(),
    name: v.string(),
    sector: universeText,
    subSector: universeText,
    industry: universeText,
    subIndustry: universeText,
    listingBoard: universeText,
    listingDate: universeText,
    indices: universeList,
    affiliates: universeList,
    current: universeValues,
    sourceIds: universeSourceIds,
    checks: v.array(universeCheckSummary),
  })
    .index("by_symbol", ["symbol"])
    .index("by_sub_sector", ["subSector"]),

  companyYears: defineTable({
    symbol: v.string(),
    year: v.number(),
    values: universeValues,
    sourceIds: universeSourceIds,
  }).index("by_symbol_and_year", ["symbol", "year"]),

  companyQuarters: defineTable({
    symbol: v.string(),
    quarter: v.string(),
    values: universeValues,
    sourceIds: universeSourceIds,
  }).index("by_symbol_and_quarter", ["symbol", "quarter"]),

  holdings: defineTable({
    symbol: v.string(),
    holderName: v.string(),
    holderKey: v.string(),
    holderKind: v.union(v.literal("entity"), v.literal("public"), v.literal("treasury")),
    percentage: universeNumber,
    shares: universeNumber,
    value: universeNumber,
    sourceId: v.string(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_holder_key", ["holderKey"]),

  universeSources: defineTable({
    id: v.string(),
    title: v.string(),
    provider: v.literal("sectors"),
    endpoint: v.string(),
    retrievedAt: v.string(),
    credits: v.number(),
  }).index("by_source_id", ["id"]),

  checkResults: defineTable(universeCheckResult)
    .index("by_symbol", ["symbol"])
    .index("by_check_id", ["checkId"]),

  owners: defineTable(ownerRecord)
    .index("by_key", ["key"])
    .index("by_listed_symbol", ["listedSymbol"]),

  businessGroups: defineTable(businessGroup).index("by_slug", ["slug"]),
});
