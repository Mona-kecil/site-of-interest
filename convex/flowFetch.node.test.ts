// @vitest-environment node

import { expect, test, vi } from "vitest";
import { fetchBrokerWindow } from "./flowRequest";

const now = new Date("2026-09-17T05:00:00.000Z");
const window = { start: "2026-09-01", end: "2026-09-14" };
const endpoint = "/v2/broker-summary/SINI/?start=2026-09-01&end=2026-09-14";
const fixture = {
  symbol: "SINI.JK",
  data: [
    {
      date: "2026-09-10",
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
      ],
    },
  ],
};

function dependencies() {
  return {
    empireSlug: "prajogo",
    tickerInput: "SINI",
    now,
    apiKey: "fixture-key",
    enabled: true,
    claim: vi.fn(async (_args: unknown) => "claimed" as const),
    store: vi.fn(async (_args: { days: unknown[] }) => true),
    fail: vi.fn(async (_args: unknown) => null),
    fetchImpl: vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify(fixture), { status: 200 }),
    ),
  };
}

test("sends one bounded broker request and stores independent rows with source", async () => {
  const deps = dependencies();
  const result = await fetchBrokerWindow(deps);

  expect(result).toEqual({ status: "fetched", window });
  expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
  expect(deps.fetchImpl.mock.calls[0]?.[0]).toBe(`https://api.sectors.app${endpoint}`);
  const stored = deps.store.mock.calls[0]?.[0];
  expect(stored.days).toHaveLength(1);
  expect(stored.days[0]).toMatchObject({
    empireSlug: "prajogo",
    ticker: "SINI",
    tradingDate: "2026-09-10",
    brokers: [
      {
        brokerCode: "YP",
        buy: { value: 30_940_000 },
        sell: { value: 4_760_000 },
        net: { value: 26_180_000 },
      },
    ],
    source: { provider: "sectors", endpoint },
  });
});

test("does not call Sectors or claim a window without the server key", async () => {
  const deps = dependencies();
  expect(await fetchBrokerWindow({ ...deps, apiKey: undefined })).toEqual({
    status: "unavailable",
    window,
  });
  expect(deps.fetchImpl).not.toHaveBeenCalled();
  expect(deps.claim).not.toHaveBeenCalled();
});

test("a configured key remains inert until the enable flag is set", async () => {
  const deps = dependencies();
  expect(await fetchBrokerWindow({ ...deps, enabled: false })).toEqual({
    status: "unavailable",
    window,
  });
  expect(deps.fetchImpl).not.toHaveBeenCalled();
  expect(deps.claim).not.toHaveBeenCalled();
});

test("does not claim or request data before the first August window is complete", async () => {
  const deps = dependencies();
  expect(
    await fetchBrokerWindow({ ...deps, now: new Date("2026-08-14T16:59:59.000Z") }),
  ).toEqual({ status: "unavailable", window: null });
  expect(deps.claim).not.toHaveBeenCalled();
  expect(deps.fetchImpl).not.toHaveBeenCalled();
});

test("requests September 15–28 only once that entire window has completed", async () => {
  const deps = dependencies();
  const expectedWindow = { start: "2026-09-15", end: "2026-09-28" };
  const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    new Response(
      JSON.stringify({ ...fixture, data: [{ ...fixture.data[0], date: "2026-09-20" }] }),
      { status: 200 },
    ),
  );
  const result = await fetchBrokerWindow({
    ...deps,
    now: new Date("2026-09-28T17:00:00.000Z"),
    fetchImpl,
  });
  expect(result).toEqual({ status: "fetched", window: expectedWindow });
  expect(fetchImpl.mock.calls[0]?.[0]).toBe(
    "https://api.sectors.app/v2/broker-summary/SINI/?start=2026-09-15&end=2026-09-28",
  );
});

test("a capped claim never reaches the paid endpoint", async () => {
  const deps = dependencies();
  const result = await fetchBrokerWindow({ ...deps, claim: vi.fn(async () => "capped" as const) });
  expect(result).toEqual({ status: "capped", window });
  expect(deps.fetchImpl).not.toHaveBeenCalled();
});

test("a storage conflict closes the window after one request", async () => {
  const deps = dependencies();
  const result = await fetchBrokerWindow({
    ...deps,
    store: vi.fn(async () => {
      throw new Error("Conflicting stored broker day");
    }),
  });
  expect(result).toEqual({ status: "capped", window });
  expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
  expect(deps.fail.mock.calls[0]?.[0]).toMatchObject({ terminal: true });
});
