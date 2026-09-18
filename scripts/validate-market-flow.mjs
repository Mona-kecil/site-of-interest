import { resolve } from "node:path";

import { validateStoredFlow } from "../src/market-flow.mjs";

const root = resolve(import.meta.dirname, "..");
const directory = resolve(root, process.argv[2] ?? "data/market-flow");
const inventory = await validateStoredFlow(directory);

console.log(`Valid market flow: ${inventory.tickers.length} tickers`);
console.log(`${inventory.marketDays} market days · ${inventory.brokerDays} broker days · ${inventory.brokerRows} broker-ticker-day rows · ${inventory.registrySnapshots} registry snapshots`);
console.log(`Coverage: ${inventory.firstTradingDate ?? "none"} → ${inventory.lastTradingDate ?? "none"}`);
console.log(`Tickers: ${inventory.tickers.join(", ") || "none"}`);
if (inventory.marketWithoutBroker.length > 0) console.log(`Market days without broker data: ${inventory.marketWithoutBroker.join(", ")}`);
if (inventory.brokerWithoutMarket.length > 0) console.log(`Broker days without market data: ${inventory.brokerWithoutMarket.join(", ")}`);
