import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildChecks } from "../src/universe/checks.mjs";
import { readUniverse } from "../src/universe/files.mjs";

const directory = resolve(import.meta.dirname, "../data/universe");
const checks = buildChecks(await readUniverse(directory));
await writeFile(resolve(directory, "checks.json"), `${JSON.stringify(checks, null, 2)}\n`);
console.log(`Built ${checks.results.length} check results for ${new Set(checks.results.map(({ symbol }) => symbol)).size} companies.`);
console.table(checks.definitions.map(({ id }) => {
  const rows = checks.results.filter(({ checkId }) => checkId === id);
  return { checkId: id, applicable: rows.length, nonNull: rows.filter(({ value }) => value !== null).length };
}));
