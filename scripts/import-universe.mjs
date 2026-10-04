import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { getSeedDeployment } from "./seed-deployment.mjs";
import { readUniverse } from "../src/universe/files.mjs";
import { buildChecks } from "../src/universe/checks.mjs";
import { validateUniverse } from "../src/universe/validate.mjs";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--dry-run")) throw new Error("Usage: node scripts/import-universe.mjs [--dry-run]");
const dryRun = args.includes("--dry-run");
let deployment = null;
try {
  const environment = await readFile(resolve(root, ".env.local"), "utf8");
  deployment = getSeedDeployment(environment, process.env);
} catch (error) {
  if (!dryRun || error.code !== "ENOENT") throw error;
}
const snapshot = await readUniverse(resolve(root, "data/universe"));
validateUniverse(snapshot);
const checks = JSON.parse(await readFile(resolve(root, "data/universe/checks.json"), "utf8"));
if (JSON.stringify(checks) !== JSON.stringify(buildChecks(snapshot))) throw new Error("checks.json is stale; run npm run build:checks");
const bySymbol = new Map();
for (const { symbol, checkId, value, percentile, peerCount, gap } of checks.results) {
  if (!bySymbol.has(symbol)) bySymbol.set(symbol, []);
  bySymbol.get(symbol).push({ checkId, value, percentile, peerCount, gap });
}
const tables = {
  companies: snapshot.companies.map((company) => ({ ...company, checks: bySymbol.get(company.symbol) ?? [] })),
  companyYears: snapshot.years,
  companyQuarters: snapshot.quarters,
  holdings: snapshot.holdings,
  universeSources: snapshot.sources,
  checkResults: checks.results,
};
const directory = await mkdtemp(join(tmpdir(), "idx-universe-"));
const commands = [];
console.log(`${dryRun ? "Dry run for" : "Importing into"} Convex deployment: ${deployment ?? "not selected (.env.local absent)"}`);
console.log(`JSONL directory: ${directory}`);
for (const [table, rows] of Object.entries(tables)) {
  const file = join(directory, `${table}.jsonl`);
  await writeFile(file, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
  const commandArgs = ["convex", "import", "--table", table, "--replace", "--yes", file];
  commands.push(commandArgs);
  console.log(`${table}: ${rows.length} rows`);
  console.log(`npx convex import --table ${table} --replace --yes '${file.replaceAll("'", "'\\''")}'`);
}
if (!dryRun) {
  for (const commandArgs of commands) await new Promise((resolveRun, rejectRun) => {
    const child = spawn("npx", commandArgs, { cwd: root, stdio: "inherit" });
    child.once("error", rejectRun);
    child.once("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`convex import exited with status ${code}`)));
  });
}
