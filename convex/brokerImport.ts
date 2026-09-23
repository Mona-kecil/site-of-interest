import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { brokerDayInput, brokerSignalInput } from "./schema";

export const importDays = internalMutation({
  args: {
    records: v.array(v.object({ day: brokerDayInput, signal: v.union(brokerSignalInput, v.null()) })),
  },
  returns: v.object({ createdDays: v.number(), existingDays: v.number(), createdSignals: v.number() }),
  handler: async (ctx, { records }) => {
    if (records.length === 0 || records.length > 2) throw new Error("Import requires one or two days");
    let createdDays = 0;
    let existingDays = 0;
    let createdSignals = 0;
    for (const { day, signal } of records) {
      const membership = await ctx.db
        .query("empireMemberships")
        .withIndex("by_empire_and_ticker", (index) =>
          index.eq("empireSlug", day.empireSlug).eq("ticker", day.ticker),
        )
        .unique();
      if (membership === null) throw new Error(`Unknown Empire ticker ${day.empireSlug}/${day.ticker}`);
      if (
        signal !== null &&
        (signal.empireSlug !== day.empireSlug ||
          signal.ticker !== day.ticker ||
          signal.tradingDate !== day.tradingDate ||
          signal.companyName !== membership.companyName)
      ) {
        throw new Error(`Signal does not match ${day.ticker} ${day.tradingDate}`);
      }
      const existingDay = await ctx.db
        .query("brokerDays")
        .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
          index
            .eq("empireSlug", day.empireSlug)
            .eq("ticker", day.ticker)
            .eq("tradingDate", day.tradingDate),
        )
        .unique();
      if (existingDay === null) {
        await ctx.db.insert("brokerDays", day);
        createdDays++;
      } else if (JSON.stringify(existingDay.brokers) !== JSON.stringify(day.brokers)) {
        throw new Error(`Conflicting broker day ${day.ticker} ${day.tradingDate}`);
      } else {
        existingDays++;
      }
      if (signal === null) continue;
      const existingSignal = await ctx.db
        .query("brokerSignals")
        .withIndex("by_empire_and_stable_id", (index) =>
          index.eq("empireSlug", signal.empireSlug).eq("stableId", signal.stableId),
        )
        .unique();
      if (existingSignal === null) {
        await ctx.db.insert("brokerSignals", signal);
        createdSignals++;
      } else if (
        existingSignal.brokerCode !== signal.brokerCode ||
        existingSignal.value !== signal.value ||
        existingSignal.buyValue !== signal.buyValue ||
        existingSignal.sellValue !== signal.sellValue ||
        existingSignal.netValue !== signal.netValue ||
        existingSignal.totalBuyValue !== signal.totalBuyValue ||
        existingSignal.observedBrokers !== signal.observedBrokers
      ) {
        throw new Error(`Conflicting broker signal ${signal.stableId}`);
      }
    }
    return { createdDays, existingDays, createdSignals };
  },
});
