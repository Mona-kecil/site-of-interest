import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createOnDemandBrokerFlow } from "./on-demand-flow.mjs";

const response = {
  symbol: "SINI.JK",
  data: [{
    date: "2026-09-16",
    summary: [{
      broker_code: "YP",
      bfreq: 8,
      blot: 130,
      bval: 30_940_000,
      bavg_per_share: 238,
      sfreq: 3,
      slot: 20,
      sval: 4_760_000,
      savg_per_share: 238,
      nlot: 110,
      nval: 26_180_000,
      navg_per_share: 238,
    }],
  }],
};

test("fetches one broker window, persists it, and returns stored history", async () => {
  const directory = await mkdtemp(join(tmpdir(), "site-of-interest-on-demand-"));
  const stats = { remoteCalls: 0, cachedCalls: 0, credits: 0 };
  const endpoints = [];
  const sectors = {
    stats,
    async requestWithUsage(endpoint) {
      endpoints.push(endpoint);
      stats.remoteCalls += 1;
      stats.credits += 1;
      return { body: response, usage: { remoteCalls: 1, cachedCalls: 0, credits: 1 } };
    },
  };
  try {
    const flow = createOnDemandBrokerFlow({
      directory,
      sectors,
      now: () => new Date("2026-09-17T05:00:00.000Z"),
    });
    const result = await flow.load("sini");

    assert.deepEqual(endpoints, ["/v2/broker-summary/SINI/?start=2026-09-04&end=2026-09-17"]);
    assert.equal(result.ticker, "SINI");
    assert.deepEqual(result.window, { start: "2026-09-04", end: "2026-09-17" });
    assert.equal(result.days.length, 1);
    assert.equal(result.days[0].tradingDate, "2026-09-16");
    assert.deepEqual(result.fetch, { created: 1, unchanged: 0, remoteCalls: 1, cachedCalls: 0, credits: 1 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("coalesces concurrent loads for the same ticker and window", async () => {
  const directory = await mkdtemp(join(tmpdir(), "site-of-interest-on-demand-"));
  const stats = { remoteCalls: 0, cachedCalls: 0, credits: 0 };
  let calls = 0;
  const sectors = {
    stats,
    async requestWithUsage() {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      stats.remoteCalls += 1;
      stats.credits += 1;
      return { body: response, usage: { remoteCalls: 1, cachedCalls: 0, credits: 1 } };
    },
  };
  try {
    const flow = createOnDemandBrokerFlow({
      directory,
      sectors,
      now: () => new Date("2026-09-17T05:00:00.000Z"),
    });
    const [first, second] = await Promise.all([flow.load("SINI"), flow.load("SINI")]);

    assert.equal(calls, 1);
    assert.deepEqual(first, second);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("clears a failed in-flight request so the next visit can retry", async () => {
  const directory = await mkdtemp(join(tmpdir(), "site-of-interest-on-demand-"));
  const stats = { remoteCalls: 0, cachedCalls: 0, credits: 0 };
  let calls = 0;
  const sectors = {
    stats,
    async requestWithUsage() {
      calls += 1;
      if (calls === 1) throw new Error("temporary failure");
      return { body: response, usage: { remoteCalls: 1, cachedCalls: 0, credits: 1 } };
    },
  };
  try {
    const flow = createOnDemandBrokerFlow({
      directory,
      sectors,
      now: () => new Date("2026-09-17T05:00:00.000Z"),
    });
    await assert.rejects(flow.load("SINI"), /temporary failure/);
    assert.equal((await flow.load("SINI")).days.length, 1);
    assert.equal(calls, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
