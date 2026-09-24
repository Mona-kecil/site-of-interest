/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const key = { empireSlug: "prajogo", ticker: "SINI" };
const source = {
  provider: "sectors" as const,
  endpoint: "/v2/broker-summary/SINI/?start=2026-08-01&end=2026-08-14",
  retrievedAt: "2026-09-17T05:00:00.000Z",
};

test("Flow only returns stored observations for a listed member from August onward", async () => {
  const t = convexTest(schema, modules);
  expect(await t.query(api.flow.get, key)).toBeNull();

  await t.run(async (ctx) => {
    await ctx.db.insert("empireMemberships", {
      ...key,
      entityId: "sini",
      exchange: "IDX",
      companyName: "SINI Example",
      evidence: [],
    });
    for (const tradingDate of ["2026-07-31", "2026-08-03", "2026-09-01"]) {
      await ctx.db.insert("brokerDays", {
        ...key,
        tradingDate,
        brokers: [],
        source,
      });
      await ctx.db.insert("marketDays", {
        ...key,
        tradingDate,
        open: null,
        high: null,
        low: null,
        close: 100,
        volume: 1000,
        marketCap: 100_000,
        source,
      });
    }
  });

  const result = await t.query(api.flow.get, key);
  expect(result?.companyName).toBe("SINI Example");
  expect(result?.brokerDays.map((day) => day.tradingDate)).toEqual(["2026-09-01", "2026-08-03"]);
  expect(result?.marketDays.map((day) => day.tradingDate)).toEqual(["2026-09-01", "2026-08-03"]);
  expect(Object.keys(result ?? {}).sort()).toEqual([
    "brokerDays",
    "companyName",
    "marketDays",
    "ticker",
  ]);
});
