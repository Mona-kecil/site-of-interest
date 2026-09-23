"use node";

import { randomUUID } from "node:crypto";
import type { Infer } from "convex/values";
import { normalizeTicker, parseBrokerDays } from "../src/market-flow.mjs";
import { brokerDayInput } from "./schema";
import { latestJakartaWindow } from "./flowWindow";

type Window = { start: string; end: string };
type Key = { empireSlug: string; ticker: string };
type Claim = Key & Window & { claimToken: string };
type Store = Key & {
  end: string;
  claimToken: string;
  retrievedAt: string;
  days: Infer<typeof brokerDayInput>[];
};
type Failure = Key & { end: string; claimToken: string; error: string; terminal: boolean };
type Status = "fetched" | "stored" | "busy" | "unavailable" | "failed" | "capped" | "unknown";

export async function fetchBrokerWindow({
  empireSlug,
  tickerInput,
  now,
  apiKey,
  enabled,
  claim,
  store,
  fail,
  fetchImpl,
}: {
  empireSlug: string;
  tickerInput: string;
  now: Date;
  apiKey: string | undefined;
  enabled: boolean;
  claim: (args: Claim) => Promise<"claimed" | "stored" | "busy" | "unknown" | "capped">;
  store: (args: Store) => Promise<boolean>;
  fail: (args: Failure) => Promise<unknown>;
  fetchImpl: typeof fetch;
}): Promise<{ status: Status; window: Window | null }> {
  const ticker = normalizeTicker(tickerInput);
  const window = latestJakartaWindow(now);
  if (!enabled || !apiKey) return { status: "unavailable", window };

  const claimToken = randomUUID();
  const claimResult = await claim({ empireSlug, ticker, ...window, claimToken });
  if (claimResult === "unknown") return { status: "unknown", window: null };
  if (claimResult !== "claimed") return { status: claimResult, window };

  const endpoint = `/v2/broker-summary/${ticker}/?${new URLSearchParams(window)}`;
  let stage: "request" | "parse" | "store" = "request";
  try {
    const response = await fetchImpl(`https://api.sectors.app${endpoint}`, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Sectors returned HTTP ${response.status}`);
    stage = "parse";
    const raw: unknown = await response.json();
    const retrievedAt = new Date().toISOString();
    const parsed = parseBrokerDays(raw, { ticker, endpoint, retrievedAt });
    const days = parsed.map((day) => ({
      empireSlug,
      ticker: day.ticker,
      tradingDate: day.tradingDate,
      brokers: day.brokers,
      source: day.source,
    }));
    stage = "store";
    const stored = await store({
      empireSlug,
      ticker,
      end: window.end,
      claimToken,
      retrievedAt,
      days,
    });
    return { status: stored ? "fetched" : "busy", window };
  } catch {
    const terminal = stage !== "request";
    await fail({
      empireSlug,
      ticker,
      end: window.end,
      claimToken,
      error: terminal
        ? "Broker response could not be stored. This window will not be requested again."
        : "Broker data could not be retrieved. One retry is available.",
      terminal,
    });
    return { status: terminal ? "capped" : "failed", window };
  }
}
