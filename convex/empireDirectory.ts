import { v } from "convex/values";
import { query } from "./_generated/server";

const evidence = v.object({
  kind: v.union(
    v.literal("provider_affiliate"),
    v.literal("provider_group_label"),
    v.literal("ownership_path"),
  ),
  sourceId: v.string(),
  locator: v.string(),
});

const membership = v.object({
  entityId: v.string(),
  ticker: v.string(),
  exchange: v.string(),
  companyName: v.string(),
  evidence: v.array(evidence),
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      slug: v.string(),
      name: v.string(),
      asOf: v.string(),
      status: v.string(),
      scope: v.string(),
      memberships: v.array(membership),
      membershipLimitReached: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const empires = await ctx.db.query("empires").take(40);

    return await Promise.all(
      empires.map(async (empire) => {
        const rows = await ctx.db
          .query("empireMemberships")
          .withIndex("by_empire", (index) => index.eq("empireSlug", empire.slug))
          .take(251);

        return {
          slug: empire.slug,
          name: empire.name,
          asOf: empire.asOf,
          status: empire.status,
          scope: empire.scope,
          memberships: rows.slice(0, 250).map((row) => ({
            entityId: row.entityId,
            ticker: row.ticker,
            exchange: row.exchange,
            companyName: row.companyName,
            evidence: row.evidence,
          })),
          membershipLimitReached: rows.length > 250,
        };
      }),
    );
  },
});
