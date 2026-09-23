/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const window = { start: "2026-09-04", end: "2026-09-17" };
const key = { empireSlug: "prajogo", ticker: "SINI" };
const source = {
  provider: "sectors" as const,
  endpoint: "/v2/broker-summary/SINI/?start=2026-09-04&end=2026-09-17",
  retrievedAt: "2026-09-17T05:00:00.000Z",
};

async function ready() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("empireMemberships", {
      ...key,
      entityId: "sini",
      exchange: "IDX",
      companyName: "SINI Example",
      evidence: [],
    });
  });
  return t;
}

function day(tradingDate: string, value: number) {
  return {
    ...key,
    tradingDate,
    brokers: [
      {
        brokerCode: "YP",
        buy: { frequency: 1, lots: 10, value, averagePrice: 100 },
        sell: { frequency: 0, lots: 0, value: 0, averagePrice: null },
        net: { lots: 10, value, averagePrice: 100 },
      },
    ],
    source,
  };
}

test("coalesces simultaneous claims for one exact broker window", async () => {
  const t = await ready();
  const [first, second] = await Promise.all([
    t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "first" }),
    t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "second" }),
  ]);
  expect([first, second].sort()).toEqual(["busy", "claimed"]);
  const records = await t.run((ctx) =>
    ctx.db
      .query("flowWindows")
      .withIndex("by_empire_and_ticker_and_end", (index) =>
        index.eq("empireSlug", key.empireSlug).eq("ticker", key.ticker).eq("end", window.end),
      )
      .take(2),
  );
  expect(records).toHaveLength(1);
});

test("rejects a ticker outside the Empire before creating a fetch claim", async () => {
  const t = convexTest(schema, modules);
  expect(await t.query(api.flow.get, { ...key, asOf: "2026-09-17T05:00:00.000Z" })).toBeNull();
  expect(
    await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "first" }),
  ).toBe("unknown");
  const records = await t.run((ctx) =>
    ctx.db
      .query("flowWindows")
      .withIndex("by_empire", (index) => index.eq("empireSlug", key.empireSlug))
      .take(1),
  );
  expect(records).toEqual([]);
});

test("persists an empty response and never claims that window again", async () => {
  const t = await ready();
  expect(
    await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "first" }),
  ).toBe("claimed");
  expect(
    await t.mutation(internal.flow.storeWindow, {
      ...key,
      end: window.end,
      claimToken: "first",
      retrievedAt: source.retrievedAt,
      days: [],
    }),
  ).toBe(true);
  expect(
    await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "second" }),
  ).toBe("stored");
  const view = await t.query(api.flow.get, { ...key, asOf: "2026-09-17T05:00:00.000Z" });
  expect(view?.window).toEqual(window);
  expect(view?.fetch.status).toBe("stored");
  expect(view?.brokerDays).toEqual([]);
});

test("rejects a conflicting imported day without partial writes", async () => {
  const t = await ready();
  await t.run((ctx) => ctx.db.insert("brokerDays", day("2026-09-16", 1000)));
  await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "first" });
  await expect(
    t.mutation(internal.flow.storeWindow, {
      ...key,
      end: window.end,
      claimToken: "first",
      retrievedAt: source.retrievedAt,
      days: [day("2026-09-15", 500), day("2026-09-16", 2000)],
    }),
  ).rejects.toThrow(/Conflicting stored broker day/);
  const rows = await t.run((ctx) =>
    ctx.db
      .query("brokerDays")
      .withIndex("by_empire_and_ticker_and_trading_date", (index) =>
        index.eq("empireSlug", key.empireSlug).eq("ticker", key.ticker),
      )
      .take(14),
  );
  expect(rows.map((row) => row.tradingDate)).toEqual(["2026-09-16"]);
  expect(rows[0].brokers[0].buy.value).toBe(1000);
  await t.mutation(internal.flow.failWindow, {
    ...key,
    end: window.end,
    claimToken: "first",
    error: "Conflict",
    terminal: true,
  });
  const view = await t.query(api.flow.get, { ...key, asOf: "2026-09-17T05:00:00.000Z" });
  expect(view?.fetch.status).toBe("capped");
  expect(
    await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "second" }),
  ).toBe("capped");
});

test("retries a failed window and ignores a stale claim token", async () => {
  const t = await ready();
  await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "first" });
  await t.mutation(internal.flow.failWindow, {
    ...key,
    end: window.end,
    claimToken: "first",
    error: "Temporary failure",
  });
  expect(
    await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "second" }),
  ).toBe("claimed");
  expect(
    await t.mutation(internal.flow.storeWindow, {
      ...key,
      end: window.end,
      claimToken: "first",
      retrievedAt: source.retrievedAt,
      days: [day("2026-09-16", 1000)],
    }),
  ).toBe(false);
  expect(
    await t.mutation(internal.flow.storeWindow, {
      ...key,
      end: window.end,
      claimToken: "second",
      retrievedAt: source.retrievedAt,
      days: [day("2026-09-16", 1000)],
    }),
  ).toBe(true);
  expect(
    (await t.query(api.flow.get, { ...key, asOf: "2026-09-17T05:00:00.000Z" }))?.fetch.status,
  ).toBe("stored");
});

test("caps a third request for the same window after two transient failures", async () => {
  const t = await ready();
  await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "first" });
  await t.mutation(internal.flow.failWindow, {
    ...key,
    end: window.end,
    claimToken: "first",
    error: "Temporary failure",
  });
  expect(
    await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "second" }),
  ).toBe("claimed");
  await t.mutation(internal.flow.failWindow, {
    ...key,
    end: window.end,
    claimToken: "second",
    error: "Temporary failure",
  });
  expect(
    await t.mutation(internal.flow.claimWindow, { ...key, ...window, claimToken: "third" }),
  ).toBe("capped");
  expect(
    (await t.query(api.flow.get, { ...key, asOf: "2026-09-17T05:00:00.000Z" }))?.fetch.status,
  ).toBe("capped");
});
