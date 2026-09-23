import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { loadEmpireCorpus } from "./load-empire-corpus.mjs";
import {
  calculateLayeredTargets,
  coverageSummary,
  edgeTone,
  entitySourceIds,
  formatMetric,
  formatProfileValue,
  groupProfileFacts,
  relationshipLabel,
  relationshipMatchesView
} from "./empire-view.mjs";

const corpusDirectory = resolve("data/empires/prajogo");

test("derives a stable ownership layout without storing UI coordinates", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const targets = calculateLayeredTargets(corpus);

  assert.equal(targets.size, corpus.entities.length);
  assert.ok(targets.get("prajogo").y < targets.get("cuan").y);
  assert.ok(targets.get("cuan").y < targets.get("ptro").y);
});

test("derives the CUAN profile sections from Sectors facts", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const profile = corpus.getEntityProfile("cuan");
  const groups = groupProfileFacts(profile.facts);

  assert.equal(groups.profile_metric.length, 8);
  assert.equal(groups.financial_year.length, 5);
  assert.equal(groups.measurement.length, 5);
  assert.equal(groups.valuation_period.length, 4);
  assert.equal(groups.data_gap.length, 1);
  assert.equal(formatProfileValue(20_345_142_032_280, "IDR"), "Rp20.35tn");
  assert.equal(formatProfileValue(-11_052_657_765_240, "IDR"), "-Rp11.05tn");
  assert.equal(formatProfileValue(3.296, "multiple"), "3.3x");
});

test("maps relationship policy to filters, tones, and labels", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const controlling = corpus.relationships.find(({ id }) => id === "prajogo-cuan");
  const minority = corpus.relationships.find(({ id }) => id === "cuan-ptro");
  const inferred = corpus.relationships.find(({ id }) => id === "cuan-kjp");
  const outsideOwner = corpus.relationships.find(({ id }) => id === "private-green-era-energy-pte-ltd-bren");
  const groupMember = corpus.relationships.find(({ id }) => id === "barito-group-ratu");

  assert.equal(edgeTone(controlling), "control");
  assert.equal(edgeTone(minority), "passive");
  assert.equal(relationshipLabel(controlling), "80.418% control");
  assert.equal(relationshipLabel(minority), "41.5% holding");
  assert.equal(relationshipMatchesView(controlling, "control"), true);
  assert.equal(relationshipMatchesView(minority, "control"), false);
  assert.equal(relationshipMatchesView(minority, "minority"), true);
  assert.equal(formatMetric(controlling.metrics[1]), "90404.9m shares");
  assert.equal(edgeTone(inferred), "event");
  assert.equal(relationshipLabel(inferred), "Inferred group link");
  assert.equal(relationshipMatchesView(inferred, "control"), false);
  assert.equal(relationshipMatchesView(inferred, "minority"), false);
  assert.equal(relationshipMatchesView(outsideOwner, "empire"), false);
  assert.equal(relationshipMatchesView(outsideOwner, "all"), true);
  assert.equal(edgeTone(groupMember), "event");
  assert.equal(relationshipLabel(groupMember), "Sectors group member");
});

test("derives profile source and coverage summaries from normalized records", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const sourceIds = entitySourceIds(corpus, "cuan");
  const coverage = coverageSummary(corpus, "cuan");

  assert.deepEqual(sourceIds.sort(), ["sectors-barito-affiliates", "sectors-cuan-mining-detail", "sectors-cuan-mining-ownership", "sectors-cuan-mining-sites", "sectors-cuan-report", "sectors-cuan-sini-subsidiaries-news", "sectors-prajogo-discovery"]);
  assert.equal(coverage.total, 5);
  assert.equal(coverage.frontier.status, "active");
  assert.ok(coverage.areas.some(({ area, status }) => area === "physical_assets" && status === "partial"));
});

test("retains sourced measurements for every listed empire company", async () => {
  const corpus = await loadEmpireCorpus(corpusDirectory);
  const companies = corpus.entities.filter(({ kind, scopeRole }) => kind === "listed_company" && scopeRole !== "boundary").map((entity) => ({
    ticker: entity.ticker,
    measurements: groupProfileFacts(corpus.getEntityProfile(entity.id).facts).measurement ?? []
  }));

  assert.deepEqual(companies.map(({ ticker }) => ticker).sort(), ["BREN", "BRPT", "CDIA", "CUAN", "NRCA", "PTRO", "RATU", "SINI", "SSIA", "TPIA"]);
  for (const { measurements } of companies) {
    assert.ok(measurements.length > 0);
    assert.ok(measurements.every(({ sourceRefs }) => sourceRefs.length > 0));
  }
});
