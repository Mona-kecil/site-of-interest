import { v, type Infer } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { brokerDayInput } from "./schema";
import schema from "./schema";
import { FLOW_COVERAGE_START, latestCompletedBrokerWindow } from "./flowWindow";
import { sameBrokerRows } from "./brokerRows";

const windowValidator = v.object({ start: v.string(), end: v.string() });
const fetchStatus = v.union(
  v.literal("idle"),
  v.literal("fetching"),
  v.literal("stored"),
  v.literal("failed"),
  v.literal("capped"),
);

export const get = query({
  args: { empireSlug: v.string(), ticker: v.string(), asOf: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      ticker: v.string(),
      companyName: v.string(),
      window: v.union(windowValidator, v.null()),
      brokerDays: v.array(schema.doc("brokerDays")),
      marketDays: v.array(schema.doc("marketDays")),
      fetch: v.object({
        status: fetchStatus,
        retrievedAt: v.union(v.string(), v.null()),
        error: v.union(v.string(), v.null()),
      }),
    }),
  ),
  handler: async (ctx, { empireSlug, ticker, asOf }) => {
    const membership = await ctx.db
      .query("empireMemberships")
      .withIndex("by_empire_and_ticker", (index) =>
        index.eq("empireSlug", empireSlug).eq("ticker", ticker),
      )
      .unique();
    if (membership === null) return null;

    const requestedWindow = latestCompletedBrokerWindow(
      asOf === undefined ? new Date() : new Date(asOf),
    );
    const current =
      requestedWindow === null
        ? null
        : await ctx.db
            .query("flowWindows")
            .withIndex("by_empire_and_ticker_and_end", (index) =>
              index
                .eq("empireSlug", empireSlug)
                .eq("ticker", ticker)
                .eq("end", requestedWindow.end),
            )
            .unique();
    const [brokerDays, marketDays] = await Promise.all([
      ctx.db
        .query("brokerDays")
        .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
          index
            .eq("empireSlug", empireSlug)
            .eq("ticker", ticker)
            .gte("tradingDate", FLOW_COVERAGE_START),
        )
        .order("desc")
        .take(30),
      ctx.db
        .query("marketDays")
        .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
          index
            .eq("empireSlug", empireSlug)
            .eq("ticker", ticker)
            .gte("tradingDate", FLOW_COVERAGE_START),
        )
        .order("desc")
        .take(30),
    ]);
    const status: Infer<typeof fetchStatus> =
      current?.status === "failed" && current.attempts >= 2
        ? "capped"
        : (current?.status ?? "idle");
    return {
      ticker,
      companyName: membership.companyName,
      window: requestedWindow,
      brokerDays,
      marketDays,
      fetch: {
        status,
        retrievedAt: current?.retrievedAt ?? null,
        error: current?.error ?? null,
      },
    };
  },
});

export const claimWindow = internalMutation({
  args: {
    empireSlug: v.string(),
    ticker: v.string(),
    start: v.string(),
    end: v.string(),
    claimToken: v.string(),
  },
  returns: v.union(
    v.literal("claimed"),
    v.literal("stored"),
    v.literal("busy"),
    v.literal("unknown"),
    v.literal("capped"),
  ),
  handler: async (ctx, { empireSlug, ticker, start, end, claimToken }) => {
    const membership = await ctx.db
      .query("empireMemberships")
      .withIndex("by_empire_and_ticker", (index) =>
        index.eq("empireSlug", empireSlug).eq("ticker", ticker),
      )
      .unique();
    if (membership === null) return "unknown" as const;
    const existing = await ctx.db
      .query("flowWindows")
      .withIndex("by_empire_and_ticker_and_end", (index) =>
        index.eq("empireSlug", empireSlug).eq("ticker", ticker).eq("end", end),
      )
      .unique();
    if (existing !== null) {
      if (existing.start !== start) throw new Error("Conflicting broker window");
      if (existing.status === "stored") return "stored" as const;
      if (existing.status === "fetching" && Date.now() - existing.claimedAt < 60_000)
        return "busy" as const;
      if (existing.attempts >= 2) return "capped" as const;
      await ctx.db.patch("flowWindows", existing._id, {
        status: "fetching",
        claimToken,
        claimedAt: Date.now(),
        attempts: existing.attempts + 1,
        retrievedAt: null,
        error: null,
      });
    } else {
      await ctx.db.insert("flowWindows", {
        empireSlug,
        ticker,
        start,
        end,
        status: "fetching",
        claimToken,
        claimedAt: Date.now(),
        attempts: 1,
        retrievedAt: null,
        error: null,
      });
    }
    return "claimed" as const;
  },
});

export const storeWindow = internalMutation({
  args: {
    empireSlug: v.string(),
    ticker: v.string(),
    end: v.string(),
    claimToken: v.string(),
    retrievedAt: v.string(),
    days: v.array(brokerDayInput),
  },
  returns: v.boolean(),
  handler: async (ctx, { empireSlug, ticker, end, claimToken, retrievedAt, days }) => {
    const window = await ctx.db
      .query("flowWindows")
      .withIndex("by_empire_and_ticker_and_end", (index) =>
        index.eq("empireSlug", empireSlug).eq("ticker", ticker).eq("end", end),
      )
      .unique();
    if (window === null || window.status !== "fetching" || window.claimToken !== claimToken)
      return false;
    if (days.length > 14) throw new Error("Broker response exceeds 14 days");
    for (const day of days) {
      if (
        day.empireSlug !== empireSlug ||
        day.ticker !== ticker ||
        day.tradingDate < window.start ||
        day.tradingDate > end
      ) {
        throw new Error("Broker response outside claimed window");
      }
      const existing = await ctx.db
        .query("brokerDays")
        .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
          index
            .eq("empireSlug", empireSlug)
            .eq("ticker", ticker)
            .eq("tradingDate", day.tradingDate),
        )
        .unique();
      if (existing === null) await ctx.db.insert("brokerDays", day);
      else if (!sameBrokerRows(existing.brokers, day.brokers)) {
        throw new Error(`Conflicting stored broker day ${ticker} ${day.tradingDate}`);
      }
    }
    await ctx.db.patch("flowWindows", window._id, { status: "stored", retrievedAt, error: null });
    return true;
  },
});

export const failWindow = internalMutation({
  args: {
    empireSlug: v.string(),
    ticker: v.string(),
    end: v.string(),
    claimToken: v.string(),
    error: v.string(),
    terminal: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { empireSlug, ticker, end, claimToken, error, terminal }) => {
    const window = await ctx.db
      .query("flowWindows")
      .withIndex("by_empire_and_ticker_and_end", (index) =>
        index.eq("empireSlug", empireSlug).eq("ticker", ticker).eq("end", end),
      )
      .unique();
    if (window !== null && window.status === "fetching" && window.claimToken === claimToken) {
      await ctx.db.patch("flowWindows", window._id, {
        status: "failed",
        error,
        attempts: terminal ? 2 : window.attempts,
      });
    }
    return null;
  },
});
