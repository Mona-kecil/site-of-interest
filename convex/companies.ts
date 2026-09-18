import { v } from "convex/values";
import { query } from "./_generated/server";

export const getIntelligence = query({
  args: {
    empireSlug: v.string(),
    ticker: v.string(),
  },
  handler: async (ctx, { empireSlug, ticker }) => {
    const company = await ctx.db
      .query("entities")
      .withIndex("by_empire_and_ticker", (index) =>
        index.eq("empireSlug", empireSlug).eq("ticker", ticker.toUpperCase()),
      )
      .unique();

    if (company === null) return null;

    const [factDocuments, coverage, outgoing, incoming, empireEntities, empireSources] =
      await Promise.all([
        ctx.db
          .query("companyFacts")
          .withIndex("by_empire_and_entity_id", (index) =>
            index.eq("empireSlug", empireSlug).eq("entityId", company.stableId),
          )
          .take(500),
        ctx.db
          .query("companyCoverage")
          .withIndex("by_empire_and_entity_id", (index) =>
            index.eq("empireSlug", empireSlug).eq("entityId", company.stableId),
          )
          .unique(),
        ctx.db
          .query("relationships")
          .withIndex("by_empire_and_from", (index) =>
            index.eq("empireSlug", empireSlug).eq("fromEntityId", company.stableId),
          )
          .take(100),
        ctx.db
          .query("relationships")
          .withIndex("by_empire_and_to", (index) =>
            index.eq("empireSlug", empireSlug).eq("toEntityId", company.stableId),
          )
          .take(100),
        ctx.db
          .query("entities")
          .withIndex("by_empire", (index) => index.eq("empireSlug", empireSlug))
          .take(500),
        ctx.db
          .query("sources")
          .withIndex("by_empire", (index) => index.eq("empireSlug", empireSlug))
          .take(500),
      ]);

    const facts = factDocuments.map((document) => document.fact);
    const sourceIds = new Set(facts.flatMap((fact) => fact.sourceRefs.map((ref) => ref.sourceId)));
    const entitiesById = new Map(empireEntities.map((entity) => [entity.stableId, entity]));
    const relationships = [...outgoing, ...incoming].map((relationship) => {
      const otherId =
        relationship.fromEntityId === company.stableId
          ? relationship.toEntityId
          : relationship.fromEntityId;
      const other = entitiesById.get(otherId);
      return {
        id: relationship.stableId,
        direction: relationship.fromEntityId === company.stableId ? "outgoing" : "incoming",
        kind: relationship.kind,
        control: relationship.control,
        metrics: relationship.metrics,
        other: {
          id: otherId,
          name: other?.displayName ?? otherId,
          ticker: other?.ticker,
        },
      };
    });

    return {
      company: {
        id: company.stableId,
        name: company.displayName,
        ticker: company.ticker ?? ticker.toUpperCase(),
        exchange: company.exchange,
        country: company.country,
        summary: company.summary,
      },
      facts: {
        metrics: facts.filter((fact) => fact.kind === "profile_metric"),
        financials: facts
          .filter((fact) => fact.kind === "financial_year")
          .sort((left, right) => left.year - right.year),
        valuations: facts
          .filter((fact) => fact.kind === "valuation_period")
          .sort((left, right) => left.year - right.year),
        signals: facts.filter((fact) => fact.kind === "signal"),
        gaps: facts.filter((fact) => fact.kind === "data_gap"),
      },
      coverage:
        coverage === null
          ? null
          : {
              frontier: coverage.frontier,
              checks: coverage.checks,
            },
      relationships,
      sources: empireSources
        .filter((source) => sourceIds.has(source.stableId))
        .map((source) => ({
          id: source.stableId,
          title: source.title,
          publisher: source.publisher,
          retrievedAt: source.retrievedAt,
          url: source.url,
        })),
    };
  },
});
