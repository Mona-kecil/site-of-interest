"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, env } from "./_generated/server";
import { fetchBrokerWindow } from "./flowRequest";

const windowValidator = v.object({ start: v.string(), end: v.string() });
const statusValidator = v.union(
  v.literal("fetched"),
  v.literal("stored"),
  v.literal("busy"),
  v.literal("unavailable"),
  v.literal("failed"),
  v.literal("capped"),
  v.literal("unknown"),
);

export const fetchLatest = action({
  args: { empireSlug: v.string(), ticker: v.string() },
  returns: v.object({ status: statusValidator, window: v.union(windowValidator, v.null()) }),
  handler: async (
    ctx,
    { empireSlug, ticker },
  ): Promise<{
    status: "fetched" | "stored" | "busy" | "unavailable" | "failed" | "capped" | "unknown";
    window: { start: string; end: string } | null;
  }> =>
    fetchBrokerWindow({
      empireSlug,
      tickerInput: ticker,
      now: new Date(),
      apiKey: env.SECTORS_API_KEY,
      enabled: env.FLOW_FETCH_ENABLED === "true",
      claim: (args) => ctx.runMutation(internal.flow.claimWindow, args),
      store: (args) => ctx.runMutation(internal.flow.storeWindow, args),
      fail: (args) => ctx.runMutation(internal.flow.failWindow, args),
      fetchImpl: fetch,
    }),
});
