/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("corpus replacement retains broker days imported after the snapshot", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.replacePrajogo, {});

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
  });

  await t.mutation(internal.seed.replacePrajogo, {});

  const retained = await t.run(async (ctx) => {
    const day = await ctx.db
      .query("brokerDays")
      .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
        index.eq("empireSlug", "prajogo").eq("ticker", "CUAN").eq("tradingDate", "2026-12-31"),
      )
      .unique();
    return day;
  });
  expect(retained?.source.endpoint).toContain("/v2/broker-summary/CUAN/");
}, 15_000);
