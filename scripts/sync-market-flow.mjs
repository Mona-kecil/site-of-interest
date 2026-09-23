import { resolve } from "node:path";

import { loadEmpireCorpus } from "../src/load-empire-corpus.mjs";
import {
  normalizeTicker,
  FlowConflictError,
  parseBrokerDays,
  parseBrokerRegistry,
  parseMarketDays,
  splitDateRange,
  writeFlowObservation,
} from "../src/market-flow.mjs";
import { createSectorsClient } from "../src/sectors-client.mjs";

const root = resolve(import.meta.dirname, "..");

function jakartaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function date(value, name) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${name} must be an ISO date`);
  }
  return value;
}

function parseArguments(argv) {
  const values = new Map();
  let refresh = false;
  let marketOnly = false;
  let brokerOnly = false;
  let skipConflicts = false;
  for (const argument of argv) {
    if (argument === "--refresh") {
      refresh = true;
      continue;
    }
    if (argument === "--market-only") {
      marketOnly = true;
      continue;
    }
    if (argument === "--broker-only") {
      brokerOnly = true;
      continue;
    }
    if (argument === "--skip-conflicts") {
      skipConflicts = true;
      continue;
    }
    const match = /^--([a-z-]+)=(.+)$/.exec(argument);
    if (!match) throw new Error(`Unsupported argument ${argument}`);
    if (!new Set(["tickers", "start", "end", "empire", "output", "max-credits"]).has(match[1])) throw new Error(`Unsupported option --${match[1]}`);
    if (values.has(match[1])) throw new Error(`Option --${match[1]} was provided more than once`);
    values.set(match[1], match[2]);
  }

  const end = date(values.get("end") ?? jakartaDate(), "--end");
  const start = date(values.get("start") ?? shiftDate(end, -13), "--start");
  const daySpan = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
  if (daySpan < 0) throw new Error("--start cannot be after --end");
  if (marketOnly && brokerOnly) throw new Error("--market-only and --broker-only cannot be combined");
  const maxCredits = Number(values.get("max-credits") ?? "0");
  if (!Number.isSafeInteger(maxCredits) || maxCredits < 0) throw new Error("--max-credits must be a non-negative integer");

  const requestedTickers = values.has("tickers")
    ? values.get("tickers").split(",").map(normalizeTicker)
    : null;
  if (requestedTickers?.length === 0) throw new Error("--tickers must contain at least one ticker");

  return {
    start,
    end,
    refresh,
    marketOnly,
    brokerOnly,
    maxCredits,
    skipConflicts,
    requestedTickers,
    empireDirectory: resolve(root, values.get("empire") ?? "data/empires/prajogo"),
    outputDirectory: resolve(root, values.get("output") ?? "data/market-flow"),
  };
}

async function tickersFor(options) {
  if (options.requestedTickers) return [...new Set(options.requestedTickers)].sort();
  const corpus = await loadEmpireCorpus(options.empireDirectory);
  return [...new Set(corpus.entities
    .filter(({ kind, scopeRole }) => kind === "listed_company" && scopeRole !== "boundary")
    .map(({ ticker }) => normalizeTicker(ticker)))].sort();
}

async function writeAll(directory, observations, counts, skipConflicts) {
  for (const observation of observations) {
    try {
      const result = await writeFlowObservation(directory, observation);
      counts[result] += 1;
    } catch (error) {
      if (!(skipConflicts && error instanceof FlowConflictError)) throw error;
      counts.conflicted += 1;
      console.warn(error.message);
    }
  }
}

const options = parseArguments(process.argv.slice(2));
const tickers = await tickersFor(options);
if (tickers.length === 0) throw new Error("No listed tickers were found for market-flow collection");
const worstCaseCredits = (options.marketOnly ? 0 : 1) + tickers.length * (
  (options.brokerOnly ? 0 : splitDateRange(options.start, options.end, 90).length) +
  (options.marketOnly ? 0 : splitDateRange(options.start, options.end, 14).length)
);
console.log(`Plan: ${tickers.join(", ")}; ${options.start} to ${options.end}; at most ${worstCaseCredits} credits before cache hits; run cap ${options.maxCredits} credits.`);

const retrievedAt = new Date().toISOString();
const sectors = await createSectorsClient({
  root,
  cacheDirectory: resolve(root, ".cache/sectors"),
  refresh: options.refresh,
  maxCredits: options.maxCredits,
});
const counts = { created: 0, unchanged: 0, conflicted: 0 };
if (!options.marketOnly) {
  const registryEndpoint = "/v2/brokers/";
  const registry = parseBrokerRegistry(await sectors.request(registryEndpoint, 1), {
    endpoint: registryEndpoint,
    retrievedAt,
  });
  await writeAll(options.outputDirectory, [registry], counts, options.skipConflicts);
}

for (const ticker of tickers) {
  let marketDayCount = 0;
  let brokerDayCount = 0;
  if (!options.brokerOnly) {
    for (const window of splitDateRange(options.start, options.end, 90)) {
      const parameters = new URLSearchParams(window);
      const endpoint = `/v2/daily/${ticker}/?${parameters}`;
      const days = parseMarketDays(await sectors.request(endpoint, 1), { ticker, retrievedAt, endpoint });
      await writeAll(options.outputDirectory, days, counts, options.skipConflicts);
      marketDayCount += days.length;
    }
  }
  if (!options.marketOnly) {
    for (const window of splitDateRange(options.start, options.end, 14)) {
      const parameters = new URLSearchParams(window);
      const endpoint = `/v2/broker-summary/${ticker}/?${parameters}`;
      const days = parseBrokerDays(await sectors.request(endpoint, 1), { ticker, retrievedAt, endpoint });
      await writeAll(options.outputDirectory, days, counts, options.skipConflicts);
      brokerDayCount += days.length;
    }
  }
  console.log(`${ticker}: ${marketDayCount} market days · ${brokerDayCount} broker days`);
}

console.log(`Stored ${counts.created} new observations; ${counts.unchanged} already matched; ${counts.conflicted} conflicts kept unchanged.`);
console.log(`Sectors usage: ${sectors.stats.remoteCalls} remote calls / ${sectors.stats.credits} credits; ${sectors.stats.cachedCalls} cache hits.`);
console.log(`Output: ${options.outputDirectory}`);
