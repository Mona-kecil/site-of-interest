import { v } from "convex/values";
import { query } from "./_generated/server";

const maxGraphRowsPerTable = 500;

const graph = v.object({
  manifest: v.object({
    id: v.string(), name: v.string(), subjectEntityId: v.string(), jurisdiction: v.string(),
    asOf: v.string(), status: v.string(), scope: v.string(), dataPolicy: v.string(),
    coverageAreas: v.array(v.string()),
  }),
  entities: v.array(v.object({
    id: v.string(), kind: v.string(), displayName: v.string(), country: v.string(),
    summary: v.string(), ticker: v.optional(v.string()), exchange: v.optional(v.string()),
    scopeRole: v.optional(v.string()),
  })),
  relationships: v.array(v.object({
    id: v.string(), from: v.string(), to: v.string(), kind: v.string(), directness: v.string(),
    control: v.string(), scope: v.string(), status: v.string(), lastVerifiedAt: v.string(),
    metrics: v.array(v.object({ kind: v.string(), value: v.number(), unit: v.string() })),
  })),
  assertions: v.array(v.object({
    id: v.string(), relationshipId: v.string(), type: v.string(), stance: v.string(),
    statement: v.string(), asOf: v.string(), confidence: v.string(),
    sourceRefs: v.array(v.object({ sourceId: v.string(), locator: v.string() })),
  })),
  sources: v.array(v.object({
    id: v.string(), title: v.string(), publisher: v.string(), provider: v.string(),
    kind: v.string(), authority: v.string(), retrievedAt: v.string(), url: v.string(),
  })),
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(graph, v.null()),
  handler: async (ctx, { slug }) => {
    const empire = await ctx.db
      .query("empires")
      .withIndex("by_slug", (index) => index.eq("slug", slug))
      .unique();

    if (empire === null) return null;

    const [entities, relationships, assertions, sources] = await Promise.all([
      ctx.db
        .query("entities")
        .withIndex("by_empire", (index) => index.eq("empireSlug", slug))
        .take(maxGraphRowsPerTable + 1),
      ctx.db
        .query("relationships")
        .withIndex("by_empire", (index) => index.eq("empireSlug", slug))
        .take(maxGraphRowsPerTable + 1),
      ctx.db
        .query("relationshipAssertions")
        .withIndex("by_empire", (index) => index.eq("empireSlug", slug))
        .take(maxGraphRowsPerTable + 1),
      ctx.db
        .query("sources")
        .withIndex("by_empire", (index) => index.eq("empireSlug", slug))
        .take(maxGraphRowsPerTable + 1),
    ]);

    if ([entities, relationships, assertions, sources].some((rows) => rows.length > maxGraphRowsPerTable)) {
      throw new Error(`Empire graph exceeds the ${maxGraphRowsPerTable}-row per-table limit`);
    }

    return {
      manifest: {
        id: empire.corpusId,
        name: empire.name,
        subjectEntityId: empire.subjectEntityId,
        jurisdiction: empire.jurisdiction,
        asOf: empire.asOf,
        status: empire.status,
        scope: empire.scope,
        dataPolicy: empire.dataPolicy,
        coverageAreas: empire.coverageAreas,
      },
      entities: entities.map((entity) => ({
        id: entity.stableId,
        kind: entity.kind,
        displayName: entity.displayName,
        country: entity.country,
        summary: entity.summary,
        ticker: entity.ticker,
        exchange: entity.exchange,
        scopeRole: entity.scopeRole,
      })),
      relationships: relationships.map((relationship) => ({
        id: relationship.stableId,
        from: relationship.fromEntityId,
        to: relationship.toEntityId,
        kind: relationship.kind,
        directness: relationship.directness,
        control: relationship.control,
        scope: relationship.scope,
        status: relationship.status,
        lastVerifiedAt: relationship.lastVerifiedAt,
        metrics: relationship.metrics,
      })),
      assertions: assertions.map((assertion) => ({
        id: assertion.stableId,
        relationshipId: assertion.relationshipId,
        type: assertion.type,
        stance: assertion.stance,
        statement: assertion.statement,
        asOf: assertion.asOf,
        confidence: assertion.confidence,
        sourceRefs: assertion.sourceRefs,
      })),
      sources: sources.map((source) => ({
        id: source.stableId,
        title: source.title,
        publisher: source.publisher,
        provider: source.provider,
        kind: source.kind,
        authority: source.authority,
        retrievedAt: source.retrievedAt,
        url: source.url,
      })),
    };
  },
});
