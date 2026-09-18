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
});
