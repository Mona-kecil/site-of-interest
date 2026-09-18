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
    kind: v.literal("signal"),
    metric: v.string(),
    label: v.string(),
    value: v.number(),
    unit: v.string(),
    tone: v.string(),
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
