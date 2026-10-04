import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const metric = v.object({
  kind: v.string(),
  value: v.number(),
  unit: v.string(),
});

const sourceRef = v.object({
  sourceId: v.string(),
  locator: v.string(),
});

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

export const membershipEvidence = v.object({
  kind: v.union(
    v.literal("provider_affiliate"),
    v.literal("provider_group_label"),
    v.literal("ownership_path"),
  ),
  sourceId: v.string(),
  locator: v.string(),
});

const factBase = v.object({
  id: v.string(),
  entityId: v.string(),
  asOf: v.string(),
  context: v.string(),
  sourceRefs: v.array(sourceRef),
});

export const companyFact = v.union(
  factBase.extend({
    kind: v.literal("profile_metric"),
    label: v.string(),
    value: v.number(),
    unit: v.string(),
  }),
  factBase.extend({
    kind: v.literal("financial_year"),
    year: v.number(),
    revenue: v.number(),
    earnings: v.number(),
    operatingCashFlow: v.number(),
    freeCashFlow: v.number(),
    totalAssets: v.optional(v.number()),
    totalDebt: v.optional(v.number()),
    capitalExpenditure: v.optional(v.number()),
    unit: v.string(),
  }),
  factBase.extend({
    kind: v.literal("valuation_period"),
    year: v.number(),
    pe: v.union(v.number(), v.null()),
    peerPe: v.union(v.number(), v.null()),
  }),
  factBase.extend({
    kind: v.literal("measurement"),
    metric: v.string(),
    label: v.string(),
    value: v.number(),
    unit: v.string(),
  }),
  factBase.extend({
    kind: v.literal("data_gap"),
    label: v.string(),
  }),
);

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

  empires: defineTable({
    slug: v.string(),
    corpusId: v.string(),
    name: v.string(),
    subjectEntityId: v.string(),
    jurisdiction: v.string(),
    asOf: v.string(),
    status: v.string(),
    scope: v.string(),
    dataPolicy: v.string(),
    coverageAreas: v.array(v.string()),
  }).index("by_slug", ["slug"]),

  entities: defineTable({
    empireSlug: v.string(),
    stableId: v.string(),
    kind: v.string(),
    displayName: v.string(),
    country: v.string(),
    summary: v.string(),
    ticker: v.optional(v.string()),
    exchange: v.optional(v.string()),
    scopeRole: v.optional(v.string()),
  })
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_stable_id", ["empireSlug", "stableId"])
    .index("by_empire_and_ticker", ["empireSlug", "ticker"])
    .index("by_ticker", ["ticker"]),

  empireMemberships: defineTable({
    empireSlug: v.string(),
    entityId: v.string(),
    ticker: v.string(),
    exchange: v.string(),
    companyName: v.string(),
    evidence: v.array(membershipEvidence),
  })
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_ticker", ["empireSlug", "ticker"])
    .index("by_ticker", ["ticker"]),

  relationships: defineTable({
    empireSlug: v.string(),
    stableId: v.string(),
    fromEntityId: v.string(),
    toEntityId: v.string(),
    kind: v.string(),
    directness: v.string(),
    control: v.string(),
    scope: v.string(),
    status: v.string(),
    lastVerifiedAt: v.string(),
    metrics: v.array(metric),
  })
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_from", ["empireSlug", "fromEntityId"])
    .index("by_empire_and_to", ["empireSlug", "toEntityId"]),

  relationshipAssertions: defineTable({
    empireSlug: v.string(),
    stableId: v.string(),
    relationshipId: v.string(),
    type: v.string(),
    stance: v.string(),
    statement: v.string(),
    asOf: v.string(),
    confidence: v.string(),
    sourceRefs: v.array(sourceRef),
  })
    .index("by_empire", ["empireSlug"])
    .index("by_relationship", ["empireSlug", "relationshipId"]),

  sources: defineTable({
    empireSlug: v.string(),
    stableId: v.string(),
    title: v.string(),
    publisher: v.string(),
    provider: v.string(),
    kind: v.string(),
    authority: v.string(),
    retrievedAt: v.string(),
    url: v.string(),
  }).index("by_empire", ["empireSlug"]),

  companyFacts: defineTable({
    empireSlug: v.string(),
    entityId: v.string(),
    stableId: v.string(),
    fact: companyFact,
  })
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_entity_id", ["empireSlug", "entityId"]),

  fundamentalSignals: defineTable({
    stableId: v.string(),
    empireSlug: v.string(),
    entityId: v.string(),
    ticker: v.string(),
    companyName: v.string(),
    sector: v.string(),
    metricId: v.string(),
    metricLabel: v.string(),
    period: v.string(),
    asOf: v.string(),
    unit: v.string(),
    formula: v.string(),
    ruleVersion: v.string(),
    value: v.union(v.number(), v.null()),
    gap: v.union(v.string(), v.null()),
    inputs: v.array(
      v.object({
        label: v.string(),
        factId: v.string(),
        value: v.number(),
        unit: v.string(),
        sourceRefs: v.array(sourceRef),
      }),
    ),
  })
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_ticker", ["empireSlug", "ticker"])
    .index("by_empire_and_stable_id", ["empireSlug", "stableId"])
    .index("by_as_of", ["asOf"])
    .index("by_metric_id_and_period_and_unit_and_value", ["metricId", "period", "unit", "value"]),

  newsRecords: defineTable({
    stableId: v.string(),
    empireSlug: v.string(),
    title: v.string(),
    articleUrl: v.string(),
    sourceName: v.string(),
    publishedAt: v.string(),
    matchedTickers: v.array(v.string()),
    matchRule: v.literal("provider_symbol_exact"),
    provider: v.literal("sectors"),
    sourceEndpoint: v.string(),
    retrievedAt: v.string(),
  })
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_stable_id", ["empireSlug", "stableId"])
    .index("by_empire_and_published_at", ["empireSlug", "publishedAt"])
    .index("by_published_at", ["publishedAt"]),

  newsCoverage: defineTable({
    empireSlug: v.string(),
    start: v.string(),
    end: v.string(),
    totalCount: v.number(),
    importedCount: v.number(),
    truncated: v.boolean(),
    retrievedAt: v.string(),
  }).index("by_empire", ["empireSlug"]),

  companyCoverage: defineTable({
    empireSlug: v.string(),
    entityId: v.string(),
    frontier: v.object({
      status: v.string(),
      priority: v.string(),
      nextAction: v.string(),
    }),
    checks: v.array(
      v.object({
        area: v.string(),
        status: v.string(),
        checkedAt: v.string(),
        sourceIds: v.array(v.string()),
        notes: v.string(),
      }),
    ),
  })
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_entity_id", ["empireSlug", "entityId"]),

  owners: defineTable(ownerRecord)
    .index("by_key", ["key"])
    .index("by_listed_symbol", ["listedSymbol"]),

  businessGroups: defineTable(businessGroup).index("by_slug", ["slug"]),
});
