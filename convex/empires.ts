import { v } from "convex/values";
import { query } from "./_generated/server";

export const getBySlug = query({
  args: { slug: v.string() },
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
        .collect(),
      ctx.db
        .query("relationships")
        .withIndex("by_empire", (index) => index.eq("empireSlug", slug))
        .collect(),
      ctx.db
        .query("relationshipAssertions")
        .withIndex("by_empire", (index) => index.eq("empireSlug", slug))
        .collect(),
      ctx.db
        .query("sources")
        .withIndex("by_empire", (index) => index.eq("empireSlug", slug))
        .collect(),
    ]);

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
