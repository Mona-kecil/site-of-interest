import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const UNIVERSE_FILES = Object.freeze(["sources", "companies", "years", "quarters", "holdings", "manifest"]);

export async function readUniverse(directory) {
  return Object.fromEntries(await Promise.all(UNIVERSE_FILES.map(async (name) => [name, JSON.parse(await readFile(join(directory, `${name}.json`), "utf8"))])));
}

export async function writeUniverse(directory, snapshot) {
  await mkdir(dirname(directory), { recursive: true });
  const staging = await mkdtemp(join(dirname(directory), ".universe-"));
  const backup = `${staging}.previous`;
  let moved = false;
  try {
    for (const name of UNIVERSE_FILES) await writeFile(join(staging, `${name}.json`), `${JSON.stringify(snapshot[name], null, 2)}\n`);
    try {
      await rename(directory, backup);
      moved = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    try {
      await rename(staging, directory);
    } catch (error) {
      if (moved) await rename(backup, directory);
      throw error;
    }
    if (moved) await rm(backup, { recursive: true });
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
