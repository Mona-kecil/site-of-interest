import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseSyncArguments, syncUniverse } from "../src/universe/sync.mjs";

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await syncUniverse({ root: resolve(import.meta.dirname, ".."), ...parseSyncArguments(process.argv.slice(2)) });
  } catch (error) {
    console.error(`Universe sync failed: ${error.message}`);
    process.exitCode = 1;
  }
}
