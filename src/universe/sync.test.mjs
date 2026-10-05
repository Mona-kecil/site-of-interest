import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { createSectorsClient } from "../sectors-client.mjs";
import { readUniverse, UNIVERSE_FILES, writeUniverse } from "./files.mjs";
import { buildQueryGroups } from "./groups.mjs";
import { parseSyncArguments, syncUniverse } from "./sync.mjs";
import { fixtureResponse, fixtureSnapshot, retrievedAt } from "./test-fixtures.mjs";
import { validateUniverse } from "./validate.mjs";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "../..");

async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), "soi-universe-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function offlineClient({ totalCount = 3, onCall = () => {} } = {}) {
  const groups = buildQueryGroups();
  let calls = 0;
  return (options) => createSectorsClient({
    ...options,
    apiKey: "offline-test-key",
    fetchImpl: async (url) => {
      calls += 1;
      const params = new URL(url).searchParams;
      const group = groups.find(({ where }) => where === params.get("where"));
      assert.ok(group, "request must match a registered query group");
      assert.equal(params.get("order_by"), "symbol");
      const offset = Number(params.get("offset"));
      const body = fixtureResponse(group, { offset, totalCount });
      const response = { ok: true, status: 200, json: async () => body };
      return onCall({ calls, group, offset, body, response }) ?? response;
    },
  });
}

test("arguments require a credit cap, accept zero, and reject typos", () => {
  assert.throws(() => parseSyncArguments([]), /--max-credits=N is required/);
  assert.throws(() => parseSyncArguments(["--dry-run"]), /--max-credits=N is required/);
  assert.deepEqual(parseSyncArguments(["--max-credits=0", "--refresh", "--dry-run"]), { maxCredits: 0, refresh: true, dryRun: true });
  for (const arg of ["--max-credits=-1", "--max-credits=1.5", "--max-credits=Infinity", "--max-credits=", "--max-credits=9007199254740992", "--refesh"]) {
    assert.throws(() => parseSyncArguments([arg]));
  }
  assert.throws(() => parseSyncArguments(["--max-credits=5", "--max-credits=6"]), /Duplicate argument/);
});

test("dry run prints the plan before any client or filesystem access", async (t) => {
  const directory = await temporary(t);
  const logs = [];
  const result = await syncUniverse({ root: directory, maxCredits: 40, dryRun: true, log: (line) => logs.push(line), createClient: () => assert.fail("client must not be created") });
  assert.equal(result, null);
  assert.match(logs[0], /10 groups \/ 271 field references/);
  assert.ok(logs.some((line) => line.startsWith("Worst-case credits: 50")));
  assert.equal(logs.at(-1), "Dry run: no requests or writes.");
  assert.deepEqual(await readdir(directory), []);
});

test("the CLI runs dry with fetch disabled and exits one without a credit cap", async (t) => {
  const directory = await temporary(t);
  const guard = join(directory, "no-network.mjs");
  await writeFile(guard, 'globalThis.fetch = () => { throw new Error("NETWORK FORBIDDEN"); };\n');
  const cli = join(root, "scripts/sync-universe.mjs");
  const output = await run(process.execPath, ["--import", guard, cli, "--dry-run", "--max-credits=40"], { cwd: directory });
  assert.match(output.stdout, /Dry run: no requests or writes/);
  assert.equal(output.stderr, "");
  await assert.rejects(run(process.execPath, ["--import", guard, cli], { cwd: directory }), (error) => error.code === 1 && /--max-credits=N is required/.test(error.stderr));
});

test("sync writes six validated files, reuses the cache for zero credits, and refreshes it", async (t) => {
  const directory = await temporary(t);
  const logs = [];
  const pages = buildQueryGroups().length;
  const options = { root: directory, maxCredits: pages, createClient: offlineClient(), now: () => retrievedAt, log: (line) => logs.push(line) };
  const data = await syncUniverse(options);
  const stored = await readUniverse(join(directory, "data/universe"));
  assert.deepEqual(stored, data);
  assert.equal(stored.manifest.companyCount, 3);
  assert.equal(stored.manifest.credits, pages);
  assert.equal(stored.quarters.find(({ symbol }) => symbol === "ADRO").values.revenueQ, 0);
  assert.equal(stored.companies.find(({ symbol }) => symbol === "MGLV").indices, null);
  assert.deepEqual((await readdir(join(directory, "data/universe"))).sort(), UNIVERSE_FILES.map((name) => `${name}.json`).sort());
  assert.match(logs.at(-1), new RegExp(`${pages} remote calls / 0 cache hits / ${pages} actual credits`));
  const validated = await run(process.execPath, [join(root, "scripts/validate-universe.mjs"), join(directory, "data/universe")]);
  assert.match(validated.stdout, /Valid universe: 3 companies/);
  logs.length = 0;
  const cached = await syncUniverse({ ...options, maxCredits: 0, createClient: (settings) => createSectorsClient({ ...settings, apiKey: "offline-test-key", fetchImpl: () => assert.fail("cached sync must not fetch") }) });
  assert.equal(cached.manifest.credits, 0);
  assert.ok(cached.sources.every(({ credits }) => credits === 0));
  assert.ok(cached.sources.every(({ retrievedAt: cachedAt }) => cachedAt !== retrievedAt && !Number.isNaN(Date.parse(cachedAt))), "cache hits keep the cache file time");
  assert.match(logs.at(-1), new RegExp(`0 remote calls / ${pages} cache hits / 0 actual credits`));
  logs.length = 0;
  await syncUniverse({ ...options, refresh: true });
  assert.match(logs.at(-1), new RegExp(`${pages} remote calls / 0 cache hits / ${pages} actual credits`));
});

test("sync fetches all pages of each group and revises the credit plan", async (t) => {
  const directory = await temporary(t);
  const calls = [];
  const logs = [];
  const groups = buildQueryGroups();
  const pages = groups.length * 2;
  const snapshot = await syncUniverse({ root: directory, maxCredits: pages, now: () => retrievedAt, log: (line) => logs.push(line), createClient: offlineClient({ totalCount: 201, onCall: ({ group, offset }) => { calls.push([group.id, offset]); } }) });
  assert.deepEqual(calls, groups.flatMap(({ id }) => [[id, 0], [id, 200]]));
  assert.equal(snapshot.sources.length, pages);
  assert.equal(snapshot.companies.length, 201);
  assert.equal(validateUniverse(snapshot).credits, pages);
  assert.ok(logs.includes(`Confirmed plan: 201 companies / ${pages} worst-case credits`));
  assert.ok(snapshot.companies.every(({ sourceIds }) => Object.keys(sourceIds).length === groups.length));
});

const failures = [
  ["non-JSON page", ({ calls, response }) => calls === 2 ? { ...response, json: async () => { throw new SyntaxError("Unexpected token '<'"); } } : undefined, /non-JSON response/],
  ["total_count change between groups", ({ calls, group, response }) => calls === 2 ? { ...response, json: async () => fixtureResponse(group, { totalCount: 4 }) } : undefined, /total_count changed/],
  ["duplicate symbol", ({ calls, body }) => { if (calls === 2) body.results[1] = body.results[0]; }, /Duplicate symbol/],
  ["company absent from a group", ({ calls, body }) => { if (calls === 2) body.results[0].symbol = "OTHER.JK"; }, /Incomplete universe|missing from group/],
  ["invalid percentage", ({ calls, body }) => { if (calls === 1) body.results[0].query_values.major_shareholders_name[0].share_percentage = "1.1"; }, /percentage outside/],
  ["missing query field", ({ calls, body }) => { if (calls === 2) delete body.results[0].query_values[Object.keys(body.results[0].query_values)[0]]; }, /missing query_values field/],
];
for (const [name, onCall, pattern] of failures) test(`${name} stops without replacing stored files`, async (t) => {
  const directory = await temporary(t);
  const previous = fixtureSnapshot();
  await writeUniverse(join(directory, "data/universe"), previous);
  await assert.rejects(syncUniverse({ root: directory, maxCredits: 45, now: () => retrievedAt, log: () => {}, createClient: offlineClient({ onCall }) }), pattern);
  assert.deepEqual(await readUniverse(join(directory, "data/universe")), previous);
  assert.deepEqual(await readdir(join(directory, "data")), ["universe"]);
});

test("a change in total_count within a group stops without writing", async (t) => {
  const directory = await temporary(t);
  await assert.rejects(syncUniverse({ root: directory, maxCredits: 45, log: () => {}, createClient: offlineClient({ totalCount: 201, onCall: ({ calls, group, offset, response }) => calls === 2 ? { ...response, json: async () => fixtureResponse(group, { offset, totalCount: 202 }) } : undefined }) }), /total_count changed/);
  assert.ok(!(await readdir(directory)).includes("data"));
});

test("credit exhaustion stops before another fetch and before any writes", async (t) => {
  const directory = await temporary(t);
  let calls = 0;
  await assert.rejects(syncUniverse({ root: directory, maxCredits: 1, log: () => {}, createClient: offlineClient({ onCall: () => { calls += 1; } }) }), /1-credit run limit/);
  assert.equal(calls, 1);
  assert.ok(!(await readdir(directory)).includes("data"));
});
