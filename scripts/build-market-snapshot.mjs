import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadMarketHistory } from "../src/market-flow.mjs";
import { buildRelativeVolume } from "../src/market-signals.mjs";

const root = resolve(import.meta.dirname, "..");
const memberships = JSON.parse(await readFile(resolve(root, "data/empires/prajogo/memberships.json"), "utf8"));
const days = [];
const signals = [];

for (const membership of memberships) {
  const history = await loadMarketHistory(resolve(root, "data/market-flow"), membership.ticker);
  const latest = history.at(-1)?.tradingDate;
  if (!latest) continue;
  const start = new Date(`${latest}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 13);
  const firstSignalDate = start.toISOString().slice(0, 10);
  for (const [index, day] of history.entries()) {
    if (day.tradingDate < firstSignalDate) continue;
    signals.push(buildRelativeVolume(day, history.slice(0, index), { empireSlug: "prajogo", companyName: membership.companyName }));
  }
  days.push(...history.slice(-40));
}

const output = resolve(root, "data/market-snapshot.json");
await writeFile(output, `${JSON.stringify({ schemaVersion: 1, days, signals }, null, 2)}\n`);
console.log(`Built ${signals.length} market measurements from ${days.length} stored days across ${memberships.length} Prajogo tickers. No API calls.`);
