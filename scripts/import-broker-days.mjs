import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { buildBrokerBuyShare } from "../src/broker-signals.mjs";
import { loadBrokerHistory, normalizeTicker, splitDateRange } from "../src/market-flow.mjs";
import { getSeedDeployment } from "./seed-deployment.mjs";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const options = new Map();
for (const argument of process.argv.slice(2)) {
  if (argument === "--apply") {
    options.set("apply", true);
    continue;
  }
  if (argument === "--all") {
    options.set("all", true);
    continue;
  }
  const match = /^--(start|end|tickers)=(.+)$/.exec(argument);
  if (!match || options.has(match[1])) throw new Error(`Unsupported or duplicate option ${argument}`);
  options.set(match[1], match[2]);
}
if (!options.has("all") && (!options.has("start") || !options.has("end"))) {
  throw new Error("Provide --start=YYYY-MM-DD and --end=YYYY-MM-DD");
}
if (options.has("all") && (options.has("start") || options.has("end"))) {
  throw new Error("--all cannot be combined with --start or --end");
}
const window = options.has("all") ? null : splitDateRange(options.get("start"), options.get("end"), 14)[0];
if (window !== null && window.end !== options.get("end")) throw new Error("One import spans at most 14 calendar days");

const memberships = JSON.parse(await readFile(resolve(root, "data/empires/prajogo/memberships.json"), "utf8"));
const requested = options.has("tickers")
  ? [...new Set(options.get("tickers").split(",").map(normalizeTicker))]
  : memberships.map(({ ticker }) => ticker);
const tickerSet = new Set(memberships.map(({ ticker }) => ticker));
for (const ticker of requested) {
  if (!tickerSet.has(ticker)) throw new Error(`${ticker} is not a listed Prajogo member`);
}

const records = [];
for (const ticker of requested) {
  const membership = memberships.find((item) => item.ticker === ticker);
  const history = await loadBrokerHistory(resolve(root, "data/market-flow"), ticker);
  for (const day of history.filter((item) => window === null || (item.tradingDate >= window.start && item.tradingDate <= window.end))) {
    records.push({
      day: {
        empireSlug: "prajogo",
        ticker,
        tradingDate: day.tradingDate,
        brokers: day.brokers,
        source: day.source,
      },
      signal: buildBrokerBuyShare(day, { empireSlug: "prajogo", companyName: membership.companyName }),
    });
  }
}
console.log(`Broker import: ${window === null ? "all stored history" : `${window.start} to ${window.end}`}; ${requested.length} tickers; ${records.length} stored days; 0 Sectors credits.`);
if (!options.has("apply")) {
  console.log("Dry run only. Add --apply to import into the configured Convex deployment.");
  process.exit(0);
}

const environment = await readFile(resolve(root, ".env.local"), "utf8");
const deployment = getSeedDeployment(environment, process.env);
console.log(`Importing into Convex deployment: ${deployment}`);
await run(process.execPath, ["scripts/build-broker-snapshot.mjs"], { cwd: root, maxBuffer: 1024 * 1024 });
let createdDays = 0;
let existingDays = 0;
let createdSignals = 0;
for (let index = 0; index < records.length; index += 2) {
  const { stdout } = await run(
    "npx",
    ["convex", "run", "brokerImport:importDays", JSON.stringify({ records: records.slice(index, index + 2) })],
    { cwd: root, maxBuffer: 1024 * 1024 },
  );
  const result = JSON.parse(stdout);
  createdDays += result.createdDays;
  existingDays += result.existingDays;
  createdSignals += result.createdSignals;
  if (records.length > 40 && (index + 2) % 40 === 0) console.log(`Processed ${Math.min(index + 2, records.length)} of ${records.length} stored days.`);
}
console.log(`Imported ${createdDays} new days and ${createdSignals} new signals; ${existingDays} days already matched.`);
