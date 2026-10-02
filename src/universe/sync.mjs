import { resolve } from "node:path";
import { createSectorsClient } from "../sectors-client.mjs";
import { writeUniverse } from "./files.mjs";
import { buildQueryGroups, EXPECTED_COMPANIES, PAGE_SIZE, worstCaseCredits } from "./groups.mjs";
import { mergeScreenerPages, parseScreenerPage } from "./screener.mjs";
import { universeCounts, validateUniverse } from "./validate.mjs";

export function parseSyncArguments(args) {
  const options = { refresh: false, dryRun: false };
  const seen = new Set();
  for (const arg of args) {
    const name = arg.split("=")[0];
    if (seen.has(name)) throw new Error(`Duplicate argument ${name}`);
    seen.add(name);
    if (arg === "--refresh") options.refresh = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (/^--max-credits=\d+$/.test(arg)) options.maxCredits = Number(arg.slice("--max-credits=".length));
    else throw new Error(`Unknown or invalid argument ${arg}`);
  }
  if (!Number.isSafeInteger(options.maxCredits) || options.maxCredits < 0) throw new Error("--max-credits=N is required; N must be a non-negative integer (0 permits cache hits only)");
  return options;
}

export async function syncUniverse({ root, maxCredits, refresh = false, dryRun = false, createClient = createSectorsClient, log = console.log, now = () => new Date().toISOString() }) {
  if (!Number.isSafeInteger(maxCredits) || maxCredits < 0) throw new Error("--max-credits=N is required; N must be a non-negative integer");
  const groups = buildQueryGroups();
  log(`IDX universe plan: ${groups.length} groups / ${groups.reduce((sum, group) => sum + group.fields.length, 0)} field references`);
  for (const group of groups) log(`${group.id}: ${group.fields.length} fields; where length ${group.where.length} characters`);
  log(`Worst-case credits: ${worstCaseCredits(groups)} (${groups.length} groups x ${Math.ceil(EXPECTED_COMPANIES / PAGE_SIZE)} pages; ${EXPECTED_COMPANIES} companies, limit ${PAGE_SIZE})`);
  log(`Credit cap: ${maxCredits}; refresh: ${refresh ? "yes" : "no"}`);
  if (dryRun) {
    log("Dry run: no requests or writes.");
    return null;
  }
  const client = await createClient({ root, cacheDirectory: resolve(root, ".cache/sectors"), maxCredits, refresh });
  const pages = [];
  let totalCount;
  for (const group of groups) {
    let offset = 0;
    while (true) {
      const endpoint = group.path(offset);
      let response;
      try {
        response = await client.requestWithUsage(endpoint, 1);
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error(`${group.id} offset ${offset}: non-JSON response or cache entry; universe files were not written`, { cause: error });
        throw error;
      }
      const page = parseScreenerPage(response.body, { group, retrievedAt: now(), credits: response.usage.credits });
      if (page.offset !== offset) throw new Error(`${group.id} returned offset ${page.offset}, expected ${offset}`);
      if (totalCount === undefined) {
        totalCount = page.totalCount;
        log(`Confirmed plan: ${totalCount} companies / ${worstCaseCredits(groups, totalCount)} worst-case credits`);
      } else if (totalCount !== page.totalCount) {
        throw new Error(`${group.id} offset ${offset}: total_count changed from ${totalCount} to ${page.totalCount}; universe files were not written`);
      }
      pages.push(page);
      if (!page.hasNext) break;
      offset = page.nextOffset;
    }
  }
  const snapshot = mergeScreenerPages(pages, { groups, retrievedAt: now() });
  const counts = validateUniverse(snapshot);
  await writeUniverse(resolve(root, "data/universe"), snapshot);
  log(`Stored universe: ${universeCounts(counts)}.`);
  log(`Sectors usage: ${client.stats.remoteCalls} remote calls / ${client.stats.cachedCalls} cache hits / ${client.stats.credits} actual credits.`);
  return snapshot;
}
