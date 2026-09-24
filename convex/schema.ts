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

export const flowSource = v.object({
  provider: v.literal("sectors"),
  endpoint: v.string(),
  retrievedAt: v.string(),
});

const brokerSide = v.object({
  frequency: v.number(),
  lots: v.number(),
  value: v.number(),
  averagePrice: v.union(v.number(), v.null()),
});

export const brokerRow = v.object({
  brokerCode: v.string(),
  buy: brokerSide,
  sell: brokerSide,
  net: v.object({
    lots: v.number(),
    value: v.number(),
    averagePrice: v.union(v.number(), v.null()),
  }),
});

export const brokerDayInput = v.object({
  empireSlug: v.string(),
  ticker: v.string(),
  tradingDate: v.string(),
  brokers: v.array(brokerRow),
  source: flowSource,
});

export const brokerSignalInput = v.object({
  stableId: v.string(),
  empireSlug: v.string(),
  ticker: v.string(),
  companyName: v.string(),
  tradingDate: v.string(),
  brokerCode: v.string(),
  metricId: v.literal("broker_buy_share"),
  metricLabel: v.string(),
  ruleVersion: v.string(),
  formula: v.string(),
  unit: v.literal("%"),
  value: v.number(),
  buyValue: v.number(),
  sellValue: v.number(),
  netValue: v.number(),
  totalBuyValue: v.number(),
  observedBrokers: v.number(),
  source: flowSource,
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

  brokerDays: defineTable(brokerDayInput)
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_ticker_and_trading_date", ["empireSlug", "ticker", "tradingDate"]),

  brokerSignals: defineTable(brokerSignalInput)
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_stable_id", ["empireSlug", "stableId"])
    .index("by_empire_and_ticker_and_trading_date", ["empireSlug", "ticker", "tradingDate"])
    .index("by_trading_date", ["tradingDate"]),

  marketDays: defineTable({
    empireSlug: v.string(),
    ticker: v.string(),
    tradingDate: v.string(),
    open: v.union(v.number(), v.null()),
    high: v.union(v.number(), v.null()),
    low: v.union(v.number(), v.null()),
    close: v.number(),
    volume: v.number(),
    marketCap: v.number(),
    source: flowSource,
  })
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_ticker_and_trading_date", ["empireSlug", "ticker", "tradingDate"]),

  marketSignals: defineTable({
    stableId: v.string(),
    empireSlug: v.string(),
    ticker: v.string(),
    companyName: v.string(),
    tradingDate: v.string(),
    metricId: v.literal("relative_volume_20"),
    metricLabel: v.string(),
    ruleVersion: v.string(),
    formula: v.string(),
    unit: v.literal("x"),
    value: v.union(v.number(), v.null()),
    gap: v.union(v.string(), v.null()),
    volume: v.number(),
    baselineAverage: v.union(v.number(), v.null()),
    baselineDays: v.array(
      v.object({
        tradingDate: v.string(),
        volume: v.number(),
        source: flowSource,
      }),
    ),
    source: flowSource,
  })
    .index("by_empire", ["empireSlug"])
    .index("by_empire_and_stable_id", ["empireSlug", "stableId"])
    .index("by_empire_and_ticker_and_trading_date", ["empireSlug", "ticker", "tradingDate"])
    .index("by_trading_date", ["tradingDate"]),

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
});
