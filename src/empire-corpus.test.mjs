import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { validateCorpus } from "./empire-corpus.mjs";
import { loadEmpireCorpus } from "./load-empire-corpus.mjs";

const corpusDirectory = resolve("data/empires/prajogo");
const fileNames = ["manifest", "entities", "relationships", "assertions", "sources", "coverage", "facts"];

async function loadRawCorpus() {
  const entries = await Promise.all(fileNames.map(async (name) => {
    const contents = await readFile(resolve(corpusDirectory, `${name}.json`), "utf8");
    return [name, JSON.parse(contents)];
  }));
  return Object.fromEntries(entries);
}

test("loads the Sectors-only Prajogo corpus and resolves the PTRO path", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const path = corpus.findPath("prajogo", "ptro");

  assert.deepEqual(path.map(({ id }) => id), ["prajogo-cuan", "cuan-ptro"]);
  assert.equal(corpus.getEntityProfile("cuan").relationships.length, 11);
  assert.ok(corpus.getEntityProfile("cuan").facts.length >= 20);
  assert.ok(corpus.getCoverageGaps("cuan").some(({ area }) => area === "physical_assets"));
});

test("resolves SINI through a listed company introduced by mining discovery", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const path = corpus.findPath("prajogo", "sini");

  assert.deepEqual(path.map(({ id }) => id), ["prajogo-cuan", "cuan-ptro", "ptro-sini"]);
  assert.equal(path.at(-1).metrics.find(({ kind }) => kind === "ownership_percent").value, 19.88);
});

test("keeps the inferred CUAN to KJP link separate from KJP's proven SINI stake", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const groupLink = corpus.relationships.find(({ id }) => id === "cuan-kjp");
  const ptroStake = corpus.relationships.find(({ id }) => id === "kjp-ptro");
  const siniStake = corpus.relationships.find(({ id }) => id === "kjp-sini");

  assert.equal(groupLink.kind, "group_affiliation");
  assert.equal(groupLink.control, "unknown");
  assert.equal(corpus.getRelationshipEvidence(groupLink.id)[0].type, "inference");
  assert.equal(ptroStake.metrics.find(({ kind }) => kind === "ownership_percent").value, 45.328);
  assert.equal(ptroStake.scope, "empire");
  assert.equal(siniStake.metrics.find(({ kind }) => kind === "ownership_percent").value, 7.9);
  assert.equal(corpus.getRelationshipEvidence(siniStake.id)[0].type, "fact");
});

test("retains outside corporate shareholders as boundary nodes", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const greenEra = corpus.getEntity("private-green-era-energy-pte-ltd");
  const stake = corpus.relationships.find(({ id }) => id === "private-green-era-energy-pte-ltd-bren");

  assert.equal(greenEra.scopeRole, "boundary");
  assert.equal(stake.scope, "boundary");
  assert.equal(stake.metrics.find(({ kind }) => kind === "ownership_percent").value, 22.665);
});

test("keeps Sectors group membership separate from concrete ownership paths", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const ratuMembership = corpus.relationships.find(({ id }) => id === "barito-group-ratu");
  const ratuParent = corpus.relationships.find(({ id }) => id === "raja-ratu");

  assert.equal(corpus.getEntity("barito-group").kind, "business_group");
  assert.equal(ratuMembership.kind, "group_membership");
  assert.equal(ratuMembership.control, "unknown");
  assert.equal(corpus.findPath("prajogo", "ratu"), null);
  assert.deepEqual(corpus.findPath("prajogo", "ratu", { includeGroupLinks: true }).map(({ id }) => id), ["prajogo-barito-group", "barito-group-ratu"]);
  assert.equal(ratuParent.scope, "boundary");
  assert.equal(ratuParent.metrics.find(({ kind }) => kind === "ownership_percent").value, 68.68);
});

test("rejects a profile fact without source evidence", async () => {
  const raw = await loadRawCorpus();
  raw.facts[0].sourceRefs = [];

  const { errors } = validateCorpus(raw);

  assert.ok(errors.some((error) => error.includes("sourceRefs must contain evidence")));
});

test("rejects any source outside the Sectors API", async () => {
  const raw = await loadRawCorpus();
  raw.sources[0].provider = "external";
  raw.sources[0].url = "https://example.com/report";

  const { errors } = validateCorpus(raw);

  assert.ok(errors.some((error) => error.includes("provider must be sectors")));
  assert.ok(errors.some((error) => error.includes("must use the Sectors API host")));
});

test("rejects a relationship that points to a missing entity", async () => {
  const raw = await loadRawCorpus();
  raw.relationships[0].to = "missing-company";

  const { errors } = validateCorpus(raw);

  assert.ok(errors.some((error) => error.includes("references missing entity missing-company")));
});

test("rejects a corpus without the Sectors-only policy", async () => {
  const raw = await loadRawCorpus();
  delete raw.manifest.dataPolicy;

  const { errors } = validateCorpus(raw);

  assert.ok(errors.includes("manifest.dataPolicy must be sectors_only"));
});

test("rejects an entity without a research coverage record", async () => {
  const raw = await loadRawCorpus();
  raw.coverage = raw.coverage.filter(({ entityId }) => entityId !== "cuan");

  const { errors } = validateCorpus(raw);

  assert.ok(errors.includes("entity cuan has no coverage record"));
});
