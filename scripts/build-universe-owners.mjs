import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readUniverse } from "../src/universe/files.mjs";
import { buildOwners, buildGroups } from "../src/universe/owners.mjs";

const directory = resolve(import.meta.dirname, "../data/universe");
const snapshot = await readUniverse(directory);
const owners = buildOwners(snapshot);
const groups = buildGroups(snapshot);
await writeFile(resolve(directory, "owners.json"), `${JSON.stringify(owners, null, 2)}\n`);
await writeFile(resolve(directory, "groups.json"), `${JSON.stringify(groups, null, 2)}\n`);
console.log(`Built ${owners.length} owners (${owners.filter(({ companyCount }) => companyCount > 1).length} multi-company, ${owners.filter(({ kind }) => kind === "company").length} listed) and ${groups.length} groups.`);
