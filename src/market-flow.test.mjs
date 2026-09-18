import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  splitDateRange,
  parseBrokerDays,
  parseBrokerRegistry,
  parseMarketDays,
  validateStoredFlow,
  writeFlowObservation,
} from "./market-flow.mjs";

const context = {
  ticker: "SINI",
  endpoint: "/v2/example/SINI/",
  retrievedAt: "2026-09-17T08:00:00.000Z",
};

test("splits an inclusive history range into endpoint-sized windows", () => {
  assert.deepEqual(splitDateRange("2026-01-01", "2026-02-01", 14), [
    { start: "2026-01-01", end: "2026-01-14" },
    { start: "2026-01-15", end: "2026-01-28" },
    { start: "2026-01-29", end: "2026-02-01" },
  ]);
  assert.deepEqual(splitDateRange("2024-02-28", "2024-03-01", 2), [
    { start: "2024-02-28", end: "2024-02-29" },
    { start: "2024-03-01", end: "2024-03-01" },
  ]);
});

test("rejects invalid history ranges before making API calls", () => {
  assert.throws(() => splitDateRange("2026-02-31", "2026-03-01", 14), /start must be an ISO date/);
  assert.throws(() => splitDateRange("2026-03-02", "2026-03-01", 14), /start cannot be after end/);
  assert.throws(() => splitDateRange("2026-03-01", "2026-03-01", 0), /windowDays must be a positive integer/);
});

test("normalizes a Sectors market day without adding derived signals", () => {
  const observations = parseMarketDays([{
    symbol: "SINI.JK",
    date: "2026-09-16",
    open: 224,
    high: 244,
    low: 220,
    close: 238,
    volume: 91_200_000,
    market_cap: 2_867_900_000_000,
  }], context);

  assert.deepEqual(observations, [{
    schemaVersion: 1,
    kind: "market_day",
    ticker: "SINI",
    tradingDate: "2026-09-16",
    open: 224,
    high: 244,
    low: 220,
    close: 238,
    volume: 91_200_000,
    marketCap: 2_867_900_000_000,
    source: {
      provider: "sectors",
      endpoint: context.endpoint,
      retrievedAt: context.retrievedAt,
    },
  }]);
  assert.equal("phase" in observations[0], false);
  assert.equal("score" in observations[0], false);
});

test("rejects market rows for a different ticker at the API boundary", () => {
  assert.throws(() => parseMarketDays([{
    symbol: "PTRO.JK",
    date: "2026-09-16",
    open: 1,
    high: 1,
    low: 1,
    close: 1,
    volume: 1,
    market_cap: 1,
  }], context), /expected SINI\.JK/);
});

test("rejects calendar dates that only look like ISO dates", () => {
  assert.throws(() => parseMarketDays([{
    symbol: "SINI.JK",
    date: "2026-02-31",
    open: 1,
    high: 1,
    low: 1,
    close: 1,
    volume: 1,
    market_cap: 1,
  }], context), /must be an ISO date/);
});

test("keeps every broker independent inside its ticker-day observation", () => {
  const observations = parseBrokerDays({
    symbol: "SINI.JK",
    start: "2026-09-16",
    end: "2026-09-16",
    data: [{
      date: "2026-09-16",
      summary: [
        {
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
        },
        {
          broker_code: "DX",
          bfreq: 0,
          blot: 0,
          bval: 0,
          bavg_per_share: null,
          sfreq: 2,
          slot: 50,
          sval: 11_900_000,
          savg_per_share: 238,
          nlot: -50,
          nval: -11_900_000,
          navg_per_share: 238,
        },
      ],
    }],
  }, context);

  assert.equal(observations.length, 1);
  assert.equal(observations[0].kind, "broker_day");
  assert.equal(observations[0].ticker, "SINI");
  assert.equal(observations[0].tradingDate, "2026-09-16");
  assert.deepEqual(observations[0].brokers.map(({ brokerCode }) => brokerCode), ["DX", "YP"]);
  assert.deepEqual(observations[0].brokers[0], {
    brokerCode: "DX",
    buy: { frequency: 0, lots: 0, value: 0, averagePrice: null },
    sell: { frequency: 2, lots: 50, value: 11_900_000, averagePrice: 238 },
    net: { lots: -50, value: -11_900_000, averagePrice: 238 },
  });
  assert.equal("role" in observations[0].brokers[0], false);
  assert.equal("affiliation" in observations[0].brokers[0], false);
});

test("rejects duplicate broker rows within one ticker and trading date", () => {
  const row = {
    broker_code: "DX",
    bfreq: 1,
    blot: 1,
    bval: 100,
    bavg_per_share: 100,
    sfreq: 0,
    slot: 0,
    sval: 0,
    savg_per_share: null,
    nlot: 1,
    nval: 100,
    navg_per_share: 100,
  };
  assert.throws(() => parseBrokerDays({
    symbol: "SINI.JK",
    start: "2026-09-16",
    end: "2026-09-16",
    data: [{ date: "2026-09-16", summary: [row, row] }],
  }, context), /duplicate broker DX/);
});

test("keeps broker registry metadata separate from ticker behavior", () => {
  const registry = parseBrokerRegistry([{
    code: "AD",
    name: "Sukadana Prima Sekuritas",
    is_foreign: false,
    cohort: "institutional",
    license_type: "Online, Perantara Pedagang Efek",
  }], {
    endpoint: "/v2/brokers/",
    retrievedAt: context.retrievedAt,
  });

  assert.deepEqual(registry.brokers[0], {
    brokerCode: "AD",
    name: "Sukadana Prima Sekuritas",
    origin: "domestic",
    cohort: "institutional",
    licenseType: "Online, Perantara Pedagang Efek",
  });
  assert.equal("role" in registry.brokers[0], false);
});

test("writes immutable partitions and treats an equivalent retry as unchanged", async () => {
  const directory = await mkdtemp(join(tmpdir(), "site-of-interest-flow-"));
  try {
    const [observation] = parseMarketDays([{
      symbol: "SINI.JK",
      date: "2026-09-16",
      open: 224,
      high: 244,
      low: 220,
      close: 238,
      volume: 91_200_000,
      market_cap: 2_867_900_000_000,
    }], context);

    assert.equal(await writeFlowObservation(directory, observation), "created");
    assert.equal(await writeFlowObservation(directory, {
      ...observation,
      source: { ...observation.source, endpoint: "/v2/daily/SINI/?start=2026-09-01&end=2026-09-16", retrievedAt: "2026-09-18T08:00:00.000Z" },
    }), "unchanged");

    const stored = JSON.parse(await readFile(join(directory, "market", "SINI", "2026-09-16.json"), "utf8"));
    assert.equal(stored.close, 238);
    await assert.rejects(
      writeFlowObservation(directory, { ...observation, close: 240 }),
      /conflicts with stored facts/,
    );

    const inventory = await validateStoredFlow(directory);
    assert.deepEqual(inventory, {
      brokerDays: 0,
      brokerRows: 0,
      marketDays: 1,
      registrySnapshots: 0,
      tickers: ["SINI"],
      firstTradingDate: "2026-09-16",
      lastTradingDate: "2026-09-16",
      marketWithoutBroker: ["SINI:2026-09-16"],
      brokerWithoutMarket: [],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
