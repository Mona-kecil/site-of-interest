/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("corpus replacement retains broker days fetched through Flow", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.seed.replacePrajogo, {});

  await t.run(async (ctx) => {
    await ctx.db.insert("brokerDays", {
      empireSlug: "prajogo",
      ticker: "CUAN",
      tradingDate: "2026-12-31",
      brokers: [],
      source: {
        provider: "sectors",
        endpoint: "/v2/broker-summary/CUAN/?start=2026-12-18&end=2026-12-31",
        retrievedAt: "2026-12-31T05:00:00.000Z",
      },
    });
    await ctx.db.insert("flowWindows", {
      empireSlug: "prajogo",
      ticker: "CUAN",
      start: "2026-12-18",
      end: "2026-12-31",
      status: "stored",
      claimToken: "fixture",
      claimedAt: 0,
      attempts: 1,
      retrievedAt: "2026-12-31T05:00:00.000Z",
      error: null,
    });
  });

  await t.mutation(api.seed.replacePrajogo, {});

  const retained = await t.run(async (ctx) => {
    const day = await ctx.db
      .query("brokerDays")
      .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
        index
          .eq("empireSlug", "prajogo")
          .eq("ticker", "CUAN")
          .eq("tradingDate", "2026-12-31"),
      )
      .unique();
    const window = await ctx.db
      .query("flowWindows")
      .withIndex("by_empire_and_ticker_and_end", (index) =>
        index.eq("empireSlug", "prajogo").eq("ticker", "CUAN").eq("end", "2026-12-31"),
      )
      .unique();
    return { day, window };
  });
  expect(retained.day?.source.endpoint).toContain("/v2/broker-summary/CUAN/");
  expect(retained.window?.status).toBe("stored");
});
