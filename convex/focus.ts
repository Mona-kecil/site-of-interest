import { v } from "convex/values";
import { query } from "./_generated/server";

const sourceRef = v.object({ sourceId: v.string(), locator: v.string() });
const metric = v.object({
  value: v.number(),
  unit: v.string(),
  period: v.string(),
  asOf: v.string(),
  factId: v.string(),
  sourceRefs: v.array(sourceRef),
  context: v.string(),
});
const maybeMetric = v.union(metric, v.null());

export const getBoard = query({
  args: { empireSlug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      empireName: v.string(),
      asOf: v.string(),
      sources: v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          retrievedAt: v.string(),
          reference: v.string(),
        }),
      ),
      rows: v.array(
        v.object({
          ticker: v.string(),
          companyName: v.string(),
          pe: maybeMetric,
          peerPe: maybeMetric,
          revenueGrowth: maybeMetric,
          earningsGrowth: maybeMetric,
          freeCashFlow: maybeMetric,
        }),
      ),
    }),
  ),
  handler: async (ctx, { empireSlug }) => {
    const empire = await ctx.db
      .query("empires")
      .withIndex("by_slug", (index) => index.eq("slug", empireSlug))
      .unique();
    if (empire === null) return null;

    const [memberships, sourceDocuments] = await Promise.all([
      ctx.db
        .query("empireMemberships")
        .withIndex("by_empire", (index) => index.eq("empireSlug", empireSlug))
        .take(101),
      ctx.db
        .query("sources")
        .withIndex("by_empire", (index) => index.eq("empireSlug", empireSlug))
        .take(501),
    ]);
    if (memberships.length > 100 || sourceDocuments.length > 500) {
      throw new Error("Focus read limit exceeded; paginate this Empire before adding more records");
    }

    const rows = await Promise.all(
      memberships.map(async (membership) => {
        const entity = await ctx.db
          .query("entities")
          .withIndex("by_empire_and_stable_id", (index) =>
            index.eq("empireSlug", empireSlug).eq("stableId", membership.entityId),
          )
          .unique();
        if (entity === null || entity.scopeRole === "boundary") return null;

        const documents = await ctx.db
          .query("companyFacts")
          .withIndex("by_empire_and_entity_id", (index) =>
            index.eq("empireSlug", empireSlug).eq("entityId", membership.entityId),
          )
          .take(101);
        if (documents.length > 100) {
          throw new Error(`Focus fact limit exceeded for ${membership.ticker}`);
        }
        const facts = documents.map((document) => document.fact);
        const valuation = facts
          .filter((fact) => fact.kind === "valuation_period")
          .sort((left, right) => right.year - left.year)[0];
        const financial = facts
          .filter((fact) => fact.kind === "financial_year")
          .sort((left, right) => right.year - left.year)[0];
        const measurements = facts
          .filter((fact) => fact.kind === "measurement")
          .sort((left, right) => right.asOf.localeCompare(left.asOf));
        const revenueGrowth = measurements.find(
          (fact) => fact.metric === "yoy_quarter_revenue_growth",
        );
        const earningsGrowth = measurements.find(
          (fact) => fact.metric === "yoy_quarter_earnings_growth",
        );

        return {
          ticker: membership.ticker,
          companyName: membership.companyName,
          pe:
            valuation?.pe == null
              ? null
              : {
                  value: valuation.pe,
                  unit: "multiple",
                  period: String(valuation.year),
                  asOf: valuation.asOf,
                  factId: valuation.id,
                  sourceRefs: valuation.sourceRefs,
                  context: valuation.context,
                },
          peerPe:
            valuation?.peerPe == null
              ? null
              : {
                  value: valuation.peerPe,
                  unit: "multiple",
                  period: String(valuation.year),
                  asOf: valuation.asOf,
                  factId: valuation.id,
                  sourceRefs: valuation.sourceRefs,
                  context: valuation.context,
                },
          revenueGrowth:
            revenueGrowth === undefined
              ? null
              : {
                  value: revenueGrowth.value,
                  unit: revenueGrowth.unit,
                  period: "Latest reported quarter, date unspecified",
                  asOf: revenueGrowth.asOf,
                  factId: revenueGrowth.id,
                  sourceRefs: revenueGrowth.sourceRefs,
                  context: revenueGrowth.context,
                },
          earningsGrowth:
            earningsGrowth === undefined
              ? null
              : {
                  value: earningsGrowth.value,
                  unit: earningsGrowth.unit,
                  period: "Latest reported quarter, date unspecified",
                  asOf: earningsGrowth.asOf,
                  factId: earningsGrowth.id,
                  sourceRefs: earningsGrowth.sourceRefs,
                  context: earningsGrowth.context,
                },
          freeCashFlow:
            financial === undefined
              ? null
              : {
                  value: financial.freeCashFlow,
                  unit: financial.unit,
                  period: String(financial.year),
                  asOf: financial.asOf,
                  factId: financial.id,
                  sourceRefs: financial.sourceRefs,
                  context: financial.context,
                },
        };
      }),
    );

    return {
      empireName: empire.name,
      asOf: empire.asOf,
      sources: sourceDocuments.map((source) => ({
        id: source.stableId,
        title: source.title,
        retrievedAt: source.retrievedAt,
        reference: source.url.replace("https://api.sectors.app", ""),
      })),
      rows: rows.filter((row) => row !== null),
    };
  },
});
