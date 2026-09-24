import { v } from "convex/values";
import { query } from "./_generated/server";
import schema from "./schema";

const flowCoverageStart = "2026-08-01";
const visibleFlowDays = 60;

export const get = query({
  args: { empireSlug: v.string(), ticker: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      ticker: v.string(),
      companyName: v.string(),
      brokerDays: v.array(schema.doc("brokerDays")),
      marketDays: v.array(schema.doc("marketDays")),
    }),
  ),
  handler: async (ctx, { empireSlug, ticker }) => {
    const membership = await ctx.db
      .query("empireMemberships")
      .withIndex("by_empire_and_ticker", (index) =>
        index.eq("empireSlug", empireSlug).eq("ticker", ticker),
      )
      .unique();
    if (membership === null) return null;

    const [brokerDays, marketDays] = await Promise.all([
      ctx.db
        .query("brokerDays")
        .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
          index
            .eq("empireSlug", empireSlug)
            .eq("ticker", ticker)
            .gte("tradingDate", flowCoverageStart),
        )
        .order("desc")
        .take(visibleFlowDays),
      ctx.db
        .query("marketDays")
        .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
          index
            .eq("empireSlug", empireSlug)
            .eq("ticker", ticker)
            .gte("tradingDate", flowCoverageStart),
        )
        .order("desc")
        .take(visibleFlowDays),
    ]);
    return {
      ticker,
      companyName: membership.companyName,
      brokerDays,
      marketDays,
    };
  },
});
