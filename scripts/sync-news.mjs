import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createSectorsClient } from "../src/sectors-client.mjs";
import { normalizeNewsResponse } from "../src/news-records.mjs";

const root = resolve(import.meta.dirname, "..");
const memberships = JSON.parse(await readFile(resolve(root, "data/empires/prajogo/memberships.json"), "utf8"));
const tickers = [...new Set(memberships.map((item) => item.ticker))].sort();
const start = "2026-09-01";
const end = "2026-09-23";
const maxPages = 4;
const sectors = await createSectorsClient({ root, cacheDirectory: resolve(root, ".cache/sectors") });
const records = new Map();
let offset = 0;
let hasNext = true;
let pages = 0;
let totalCount = 0;
const retrievedAt = new Date().toISOString();

while (hasNext && pages < maxPages) {
  const params = new URLSearchParams({ extension: "idx", symbols: tickers.join(","), start, end, limit: "30", offset: String(offset) });
  const endpoint = `/v2/news/?${params}`;
  const result = normalizeNewsResponse(await sectors.request(endpoint, 1), { tickers, endpoint, retrievedAt });
  for (const item of result.records) records.set(item.stableId, item);
  hasNext = result.hasNext;
  totalCount = result.totalCount;
  pages += 1;
  if (hasNext && (!Number.isInteger(result.nextOffset) || result.nextOffset <= offset)) throw new Error("News pagination did not advance");
  offset = result.nextOffset ?? offset;
}

const output = resolve(root, "data/news-snapshot.json");
await writeFile(output, `${JSON.stringify({ schemaVersion: 1, query: { start, end, tickers, pages, totalCount, truncated: hasNext }, records: [...records.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) }, null, 2)}\n`);
console.log(`Stored ${records.size} news records from ${pages} pages; ${hasNext ? "more pages remain" : "pagination complete"}.`);
console.log(`Sectors usage: ${sectors.stats.remoteCalls} remote calls / ${sectors.stats.credits} credits; ${sectors.stats.cachedCalls} cache hits.`);
