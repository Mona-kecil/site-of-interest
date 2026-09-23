import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadBrokerHistory } from "../src/market-flow.mjs";
import { buildBrokerBuyShare } from "../src/broker-signals.mjs";

const root = resolve(import.meta.dirname, "..");
const memberships = JSON.parse(await readFile(resolve(root, "data/empires/prajogo/memberships.json"), "utf8"));
const tickers = [...new Set(memberships.map((item) => item.ticker))].sort();
const days = [];
const signals = [];

for (const ticker of tickers) {
  const history = await loadBrokerHistory(resolve(root, "data/market-flow"), ticker);
  for (const day of history) {
    if (day.brokers.length > 256) throw new Error(`${ticker} ${day.tradingDate} exceeds 256 broker rows`);
    days.push(day);
    const membership = memberships.find((item) => item.ticker === ticker);
    const signal = buildBrokerBuyShare(day, { empireSlug: "prajogo", companyName: membership.companyName });
    if (signal) signals.push(signal);
  }
}

const output = resolve(root, "data/broker-snapshot.json");
await writeFile(output, `${JSON.stringify({ schemaVersion: 1, days, signals }, null, 2)}\n`);
console.log(`Built ${signals.length} broker measurements from ${days.length} stored days across ${tickers.length} Prajogo tickers. No API calls.`);
