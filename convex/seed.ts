import { mutation } from "./_generated/server";
import assertions from "../data/empires/prajogo/assertions.json";
import entities from "../data/empires/prajogo/entities.json";
import manifest from "../data/empires/prajogo/manifest.json";
import relationships from "../data/empires/prajogo/relationships.json";
import sources from "../data/empires/prajogo/sources.json";

const slug = "prajogo";
const empireTables: Array<
  "relationshipAssertions" | "relationships" | "sources" | "entities"
> = ["relationshipAssertions", "relationships", "sources", "entities"];

export const replacePrajogo = mutation({
  args: {},
  handler: async (ctx) => {
    const existingEmpire = await ctx.db
      .query("empires")
      .withIndex("by_slug", (index) => index.eq("slug", slug))
      .unique();

    for (const table of empireTables) {
      const documents = await ctx.db
        .query(table)
        .withIndex("by_empire", (index) => index.eq("empireSlug", slug))
        .collect();
      for (const document of documents) await ctx.db.delete(document._id);
    }

    if (existingEmpire !== null) await ctx.db.delete(existingEmpire._id);

    await ctx.db.insert("empires", {
      slug,
      corpusId: manifest.id,
      name: manifest.name,
      subjectEntityId: manifest.subjectEntityId,
      jurisdiction: manifest.jurisdiction,
      asOf: manifest.asOf,
      status: manifest.status,
      scope: manifest.scope,
      dataPolicy: manifest.dataPolicy,
      coverageAreas: manifest.coverageAreas,
    });

    for (const entity of entities) {
      await ctx.db.insert("entities", {
        empireSlug: slug,
        stableId: entity.id,
        kind: entity.kind,
        displayName: entity.displayName,
        country: entity.country,
        summary: entity.summary,
        ticker: entity.ticker,
        exchange: entity.exchange,
        scopeRole: entity.scopeRole,
      });
    }

    for (const relationship of relationships) {
      await ctx.db.insert("relationships", {
        empireSlug: slug,
        stableId: relationship.id,
        fromEntityId: relationship.from,
        toEntityId: relationship.to,
        kind: relationship.kind,
        directness: relationship.directness,
        control: relationship.control,
        scope: relationship.scope,
        status: relationship.status,
        lastVerifiedAt: relationship.lastVerifiedAt,
        metrics: relationship.metrics,
      });
    }

    for (const assertion of assertions) {
      await ctx.db.insert("relationshipAssertions", {
        empireSlug: slug,
        stableId: assertion.id,
        relationshipId: assertion.relationshipId,
        type: assertion.type,
        stance: assertion.stance,
        statement: assertion.statement,
        asOf: assertion.asOf,
        confidence: assertion.confidence,
        sourceRefs: assertion.sourceRefs,
      });
    }

    for (const source of sources) {
      await ctx.db.insert("sources", {
        empireSlug: slug,
        stableId: source.id,
        title: source.title,
        publisher: source.publisher,
        provider: source.provider,
        kind: source.kind,
        authority: source.authority,
        retrievedAt: source.retrievedAt,
        url: source.url,
      });
    }

    return {
      slug,
      entities: entities.length,
      relationships: relationships.length,
      assertions: assertions.length,
      sources: sources.length,
    };
  },
});
