import { resolve } from "node:path";
import { readUniverse } from "../src/universe/files.mjs";
import { universeCounts, validateUniverse } from "../src/universe/validate.mjs";

try {
  const directory = resolve(import.meta.dirname, "..", process.argv[2] ?? "data/universe");
  const counts = validateUniverse(await readUniverse(directory));
  console.log(`Valid universe: ${universeCounts(counts)}.`);
} catch (error) {
  console.error(`Universe validation failed: ${error.message}`);
  process.exitCode = 1;
}
