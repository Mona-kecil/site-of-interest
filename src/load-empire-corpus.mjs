import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CORPUS_FILE_NAMES, createEmpireCorpus } from "./empire-corpus.mjs";

export async function loadEmpireCorpus(directory) {
  const entries = await Promise.all(CORPUS_FILE_NAMES.map(async (name) => {
    const contents = await readFile(join(directory, `${name}.json`), "utf8");
    return [name, JSON.parse(contents)];
  }));
  return createEmpireCorpus(Object.fromEntries(entries));
}
