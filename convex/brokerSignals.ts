import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import schema from "./schema";

export const list = query({
  args: { start: v.string(), end: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("brokerSignals")),
  handler: async (ctx, args) =>
    ctx.db
      .query("brokerSignals")
      .withIndex("by_trading_date", (index) =>
        index.gte("tradingDate", args.start).lte("tradingDate", args.end),
      )
      .order("desc")
      .paginate(args.paginationOpts),
});

export const detail = query({
  args: { empireSlug: v.string(), stableId: v.string() },
  returns: v.union(
    v.object({ signal: schema.doc("brokerSignals"), day: schema.doc("brokerDays") }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const signal = await ctx.db
      .query("brokerSignals")
      .withIndex("by_empire_and_stable_id", (index) =>
        index.eq("empireSlug", args.empireSlug).eq("stableId", args.stableId),
      )
      .unique();
    if (signal === null) return null;
    const day = await ctx.db
      .query("brokerDays")
      .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
        index
          .eq("empireSlug", signal.empireSlug)
          .eq("ticker", signal.ticker)
          .eq("tradingDate", signal.tradingDate),
      )
      .unique();
    if (day === null) return null;
    return { signal, day };
  },
});

export const byCompany = query({
  args: { empireSlug: v.string(), ticker: v.string() },
  returns: v.array(schema.doc("brokerDays")),
  handler: async (ctx, args) =>
    ctx.db
      .query("brokerDays")
      .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
        index.eq("empireSlug", args.empireSlug).eq("ticker", args.ticker),
      )
      .order("desc")
      .take(120),
});
