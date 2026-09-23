import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const BROKER_COHORTS = new Set(["retail", "mixed", "institutional", "unknown"]);
const FLOW_KINDS = new Set(["market_day", "broker_day", "broker_registry"]);

export class FlowConflictError extends Error {}

function record(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value;
}

function array(value, path) {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value;
}

function string(value, path) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path} must be a non-empty string`);
  return value;
}

function isoDate(value, path) {
  string(value, path);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${path} must be an ISO date`);
  }
  return value;
}

function isoTimestamp(value, path) {
  string(value, path);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${path} must be an ISO timestamp`);
  return value;
}

function shiftIsoDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function splitDateRange(start, end, windowDays) {
  isoDate(start, "start");
  isoDate(end, "end");
  if (!Number.isInteger(windowDays) || windowDays < 1) throw new Error("windowDays must be a positive integer");
  if (start > end) throw new Error("start cannot be after end");

  const windows = [];
  let cursor = start;
  while (cursor <= end) {
    const candidateEnd = shiftIsoDate(cursor, windowDays - 1);
    const windowEnd = candidateEnd < end ? candidateEnd : end;
    windows.push({ start: cursor, end: windowEnd });
    cursor = shiftIsoDate(windowEnd, 1);
  }
  return windows;
}

function number(value, path, { integer = false, nonNegative = false, nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path} must be a finite number${nullable ? " or null" : ""}`);
  if (integer && !Number.isInteger(value)) throw new Error(`${path} must be an integer`);
  if (nonNegative && value < 0) throw new Error(`${path} must be non-negative`);
  return value;
}

export function normalizeTicker(value) {
  const ticker = string(value, "ticker").toUpperCase().replace(/\.JK$/, "");
  if (!/^[A-Z0-9]{4}$/.test(ticker)) throw new Error(`ticker ${JSON.stringify(value)} must contain four letters or digits`);
  return ticker;
}

function source(context) {
  const value = record(context, "context");
  const endpoint = string(value.endpoint, "context.endpoint");
  if (!endpoint.startsWith("/v2/")) throw new Error("context.endpoint must be a Sectors v2 API path");
  return {
    provider: "sectors",
    endpoint,
    retrievedAt: isoTimestamp(value.retrievedAt, "context.retrievedAt"),
  };
}

function expectedSymbol(rawSymbol, ticker, path) {
  const symbol = string(rawSymbol, path).toUpperCase();
  if (symbol !== `${ticker}.JK` && symbol !== ticker) throw new Error(`${path} expected ${ticker}.JK but received ${symbol}`);
}

function marketDay(raw, ticker, context, index) {
  const row = record(raw, `market[${index}]`);
  expectedSymbol(row.symbol, ticker, `market[${index}].symbol`);
  const open = number(row.open, `market[${index}].open`, { integer: true, nonNegative: true, nullable: true });
  const high = number(row.high, `market[${index}].high`, { integer: true, nonNegative: true, nullable: true });
  const low = number(row.low, `market[${index}].low`, { integer: true, nonNegative: true, nullable: true });
  if (high !== null && low !== null && high < low) throw new Error(`market[${index}].high cannot be below low`);
  return {
    schemaVersion: 1,
    kind: "market_day",
    ticker,
    tradingDate: isoDate(row.date, `market[${index}].date`),
    open,
    high,
    low,
    close: number(row.close, `market[${index}].close`, { integer: true, nonNegative: true }),
    volume: number(row.volume, `market[${index}].volume`, { integer: true, nonNegative: true }),
    marketCap: number(row.market_cap, `market[${index}].market_cap`, { integer: true, nonNegative: true }),
    source: context,
  };
}

export function parseMarketDays(raw, context) {
  const ticker = normalizeTicker(context?.ticker);
  const normalizedSource = source(context);
  const dates = new Set();
  return array(raw, "market").map((row, index) => {
    const observation = marketDay(row, ticker, normalizedSource, index);
    if (dates.has(observation.tradingDate)) throw new Error(`market contains duplicate date ${observation.tradingDate}`);
    dates.add(observation.tradingDate);
    return observation;
  }).sort((first, second) => first.tradingDate.localeCompare(second.tradingDate));
}

function brokerSide(row, prefix, path) {
  return {
    frequency: number(row[`${prefix}freq`], `${path}.${prefix}freq`, { integer: true, nonNegative: true }),
    lots: number(row[`${prefix}lot`], `${path}.${prefix}lot`, { integer: true, nonNegative: true }),
    value: number(row[`${prefix}val`], `${path}.${prefix}val`, { integer: true, nonNegative: true }),
    averagePrice: number(row[`${prefix}avg_per_share`], `${path}.${prefix}avg_per_share`, { nonNegative: true, nullable: true }),
  };
}

function brokerRow(raw, path) {
  const row = record(raw, path);
  const brokerCode = string(row.broker_code, `${path}.broker_code`).toUpperCase();
  if (!/^[A-Z0-9]{2}$/.test(brokerCode)) throw new Error(`${path}.broker_code must contain two letters or digits`);
  return {
    brokerCode,
    buy: brokerSide(row, "b", path),
    sell: brokerSide(row, "s", path),
    net: {
      lots: number(row.nlot, `${path}.nlot`, { integer: true }),
      value: number(row.nval, `${path}.nval`, { integer: true }),
      averagePrice: number(row.navg_per_share, `${path}.navg_per_share`, { nonNegative: true, nullable: true }),
    },
  };
}

export function parseBrokerDays(raw, context) {
  const response = record(raw, "broker summary");
  const ticker = normalizeTicker(context?.ticker);
  expectedSymbol(response.symbol, ticker, "broker summary.symbol");
  const normalizedSource = source(context);
  const dates = new Set();

  return array(response.data, "broker summary.data").map((rawDay, dayIndex) => {
    const day = record(rawDay, `broker summary.data[${dayIndex}]`);
    const tradingDate = isoDate(day.date, `broker summary.data[${dayIndex}].date`);
    if (dates.has(tradingDate)) throw new Error(`broker summary contains duplicate date ${tradingDate}`);
    dates.add(tradingDate);
    const brokerCodes = new Set();
    const brokers = array(day.summary, `broker summary.data[${dayIndex}].summary`).map((rawBroker, brokerIndex) => {
      const broker = brokerRow(rawBroker, `broker summary.data[${dayIndex}].summary[${brokerIndex}]`);
      if (brokerCodes.has(broker.brokerCode)) throw new Error(`broker summary ${tradingDate} contains duplicate broker ${broker.brokerCode}`);
      brokerCodes.add(broker.brokerCode);
      return broker;
    }).sort((first, second) => first.brokerCode.localeCompare(second.brokerCode));
    return {
      schemaVersion: 1,
      kind: "broker_day",
      ticker,
      tradingDate,
      brokers,
      source: normalizedSource,
    };
  }).sort((first, second) => first.tradingDate.localeCompare(second.tradingDate));
}

export function parseBrokerRegistry(raw, context) {
  const normalizedSource = source(context);
  const codes = new Set();
  const brokers = array(raw, "broker registry").map((rawBroker, index) => {
    const broker = record(rawBroker, `broker registry[${index}]`);
    const brokerCode = string(broker.code, `broker registry[${index}].code`).toUpperCase();
    if (!/^[A-Z0-9]{2}$/.test(brokerCode)) throw new Error(`broker registry[${index}].code must contain two letters or digits`);
    if (codes.has(brokerCode)) throw new Error(`broker registry contains duplicate broker ${brokerCode}`);
    codes.add(brokerCode);
    const cohort = broker.cohort === null ? null : string(broker.cohort, `broker registry[${index}].cohort`).toLowerCase();
    if (cohort !== null && !BROKER_COHORTS.has(cohort)) throw new Error(`broker registry[${index}].cohort has unsupported value ${cohort}`);
    if (typeof broker.is_foreign !== "boolean") throw new Error(`broker registry[${index}].is_foreign must be a boolean`);
    return {
      brokerCode,
      name: string(broker.name, `broker registry[${index}].name`),
      origin: broker.is_foreign ? "foreign" : "domestic",
      cohort,
      licenseType: broker.license_type === null ? null : string(broker.license_type, `broker registry[${index}].license_type`),
    };
  }).sort((first, second) => first.brokerCode.localeCompare(second.brokerCode));

  return {
    schemaVersion: 1,
    kind: "broker_registry",
    asOf: normalizedSource.retrievedAt.slice(0, 10),
    brokers,
    source: normalizedSource,
  };
}

function validateSource(value, path) {
  const parsed = source(value);
  if (value.provider !== "sectors") throw new Error(`${path}.provider must be sectors`);
  return parsed;
}

function validateFlowObservation(value) {
  const observation = record(value, "observation");
  if (observation.schemaVersion !== 1) throw new Error("observation.schemaVersion must be 1");
  if (!FLOW_KINDS.has(observation.kind)) throw new Error(`observation.kind has unsupported value ${observation.kind}`);
  validateSource(observation.source, "observation.source");
  if (observation.kind === "market_day") {
    parseMarketDays([{
      symbol: observation.ticker,
      date: observation.tradingDate,
      open: observation.open,
      high: observation.high,
      low: observation.low,
      close: observation.close,
      volume: observation.volume,
      market_cap: observation.marketCap,
    }], { ticker: observation.ticker, ...observation.source });
  } else if (observation.kind === "broker_day") {
    normalizeTicker(observation.ticker);
    isoDate(observation.tradingDate, "observation.tradingDate");
    const codes = new Set();
    array(observation.brokers, "observation.brokers").forEach((broker, index) => {
      const item = record(broker, `observation.brokers[${index}]`);
      const code = string(item.brokerCode, `observation.brokers[${index}].brokerCode`);
      if (!/^[A-Z0-9]{2}$/.test(code)) throw new Error(`observation.brokers[${index}].brokerCode must contain two letters or digits`);
      if (codes.has(code)) throw new Error(`observation contains duplicate broker ${code}`);
      codes.add(code);
      for (const side of ["buy", "sell"]) {
        const values = record(item[side], `observation.brokers[${index}].${side}`);
        number(values.frequency, `${side}.frequency`, { integer: true, nonNegative: true });
        number(values.lots, `${side}.lots`, { integer: true, nonNegative: true });
        number(values.value, `${side}.value`, { integer: true, nonNegative: true });
        number(values.averagePrice, `${side}.averagePrice`, { nonNegative: true, nullable: true });
      }
      const net = record(item.net, `observation.brokers[${index}].net`);
      number(net.lots, "net.lots", { integer: true });
      number(net.value, "net.value", { integer: true });
      number(net.averagePrice, "net.averagePrice", { nonNegative: true, nullable: true });
    });
  } else {
    isoDate(observation.asOf, "observation.asOf");
    const codes = new Set();
    array(observation.brokers, "observation.brokers").forEach((rawBroker, index) => {
      const broker = record(rawBroker, `observation.brokers[${index}]`);
      const brokerCode = string(broker.brokerCode, `observation.brokers[${index}].brokerCode`);
      if (!/^[A-Z0-9]{2}$/.test(brokerCode)) throw new Error(`observation.brokers[${index}].brokerCode must contain two letters or digits`);
      if (codes.has(brokerCode)) throw new Error(`observation contains duplicate broker ${brokerCode}`);
      codes.add(brokerCode);
      string(broker.name, `observation.brokers[${index}].name`);
      if (!new Set(["domestic", "foreign"]).has(broker.origin)) throw new Error(`observation.brokers[${index}].origin is unsupported`);
      if (broker.cohort !== null && !BROKER_COHORTS.has(broker.cohort)) throw new Error(`observation.brokers[${index}].cohort is unsupported`);
      if (broker.licenseType !== null) string(broker.licenseType, `observation.brokers[${index}].licenseType`);
    });
  }
  return observation;
}

export function flowObservationPath(root, observation) {
  validateFlowObservation(observation);
  if (observation.kind === "market_day") return join(root, "market", observation.ticker, `${observation.tradingDate}.json`);
  if (observation.kind === "broker_day") return join(root, "brokers", observation.ticker, `${observation.tradingDate}.json`);
  return join(root, "registry", `${observation.asOf}.json`);
}

function comparableObservation(observation) {
  const { source: ignored, ...facts } = observation;
  return facts;
}

function sameFacts(first, second) {
  return JSON.stringify(comparableObservation(first)) === JSON.stringify(comparableObservation(second));
}

export async function writeFlowObservation(root, observation) {
  validateFlowObservation(observation);
  const target = flowObservationPath(root, observation);
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(observation, null, 2)}\n`, { flag: "wx" });
  try {
    await link(temporary, target);
    return "created";
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existing = validateFlowObservation(JSON.parse(await readFile(target, "utf8")));
    if (!sameFacts(existing, observation)) throw new FlowConflictError(`${target} conflicts with stored facts`);
    return "unchanged";
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function filesIn(directory) {
  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => join(directory, entry.name));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function loadBrokerHistory(root, ticker) {
  const normalizedTicker = normalizeTicker(ticker);
  const paths = await filesIn(join(root, "brokers", normalizedTicker));
  const days = await Promise.all(paths.map(async (path) => {
    const observation = validateFlowObservation(JSON.parse(await readFile(path, "utf8")));
    if (observation.kind !== "broker_day" || observation.ticker !== normalizedTicker) {
      throw new Error(`${path} is not broker history for ${normalizedTicker}`);
    }
    if (flowObservationPath(root, observation) !== path) throw new Error(`${path} does not match its observation key`);
    return observation;
  }));
  return days.sort((first, second) => first.tradingDate.localeCompare(second.tradingDate));
}

export async function loadMarketHistory(root, ticker) {
  const normalizedTicker = normalizeTicker(ticker);
  const paths = await filesIn(join(root, "market", normalizedTicker));
  const days = await Promise.all(paths.map(async (path) => {
    const observation = validateFlowObservation(JSON.parse(await readFile(path, "utf8")));
    if (observation.kind !== "market_day" || observation.ticker !== normalizedTicker) {
      throw new Error(`${path} is not market history for ${normalizedTicker}`);
    }
    if (flowObservationPath(root, observation) !== path) throw new Error(`${path} does not match its observation key`);
    return observation;
  }));
  return days.sort((first, second) => first.tradingDate.localeCompare(second.tradingDate));
}

async function tickerFiles(root, domain) {
  const directory = join(root, domain);
  let tickerEntries;
  try {
    tickerEntries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const groups = await Promise.all(tickerEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => filesIn(join(directory, entry.name))));
  return groups.flat();
}

export async function validateStoredFlow(root) {
  const [marketFiles, brokerFiles, registryFiles] = await Promise.all([
    tickerFiles(root, "market"),
    tickerFiles(root, "brokers"),
    filesIn(join(root, "registry")),
  ]);
  const observations = await Promise.all([...marketFiles, ...brokerFiles, ...registryFiles].map(async (path) => {
    const observation = validateFlowObservation(JSON.parse(await readFile(path, "utf8")));
    if (flowObservationPath(root, observation) !== path) throw new Error(`${path} does not match its observation key`);
    return observation;
  }));
  const tradingDays = observations.filter(({ kind }) => kind !== "broker_registry");
  const dates = tradingDays.map(({ tradingDate }) => tradingDate).sort();
  const marketKeys = new Set(observations
    .filter(({ kind }) => kind === "market_day")
    .map(({ ticker, tradingDate }) => `${ticker}:${tradingDate}`));
  const brokerKeys = new Set(observations
    .filter(({ kind }) => kind === "broker_day")
    .map(({ ticker, tradingDate }) => `${ticker}:${tradingDate}`));
  return {
    brokerDays: observations.filter(({ kind }) => kind === "broker_day").length,
    brokerRows: observations.filter(({ kind }) => kind === "broker_day").reduce((total, day) => total + day.brokers.length, 0),
    marketDays: observations.filter(({ kind }) => kind === "market_day").length,
    registrySnapshots: observations.filter(({ kind }) => kind === "broker_registry").length,
    tickers: [...new Set(tradingDays.map(({ ticker }) => ticker))].sort(),
    firstTradingDate: dates.at(0) ?? null,
    lastTradingDate: dates.at(-1) ?? null,
    marketWithoutBroker: [...marketKeys].filter((key) => !brokerKeys.has(key)).sort(),
    brokerWithoutMarket: [...brokerKeys].filter((key) => !marketKeys.has(key)).sort(),
  };
}
