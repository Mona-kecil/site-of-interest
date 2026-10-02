import assert from "node:assert/strict";
import test from "node:test";
import { buildQueryGroups } from "./groups.mjs";
import { holderKey, holderKind, mergeScreenerPages, parseScreenerPage } from "./screener.mjs";
import { fixtureGroup, fixtureResponse, fixtures, retrievedAt } from "./test-fixtures.mjs";

test("normalizes the probe page, retaining the bank, nulls, and public and treasury holdings", () => {
  const group = fixtureGroup("wide-fields")[0];
  const page = parseScreenerPage(fixtures["wide-fields"], { group, retrievedAt, credits: 0 });
  const bank = page.companies.find(({ symbol }) => symbol === "BBCA");
  assert.equal(bank.name, "PT Bank Central Asia Tbk.");
  assert.equal(bank.subSector, "Banks");
  assert.equal(bank.current.freeFloat, 0.44642);
  assert.equal(page.companies.find(({ symbol }) => symbol === "MGLV").current.roeTtm, null);
  assert.equal(page.years.find(({ symbol }) => symbol === "BBCA").values.freeCashFlow, 75057575000000);
  const holdings = page.holdings.filter(({ symbol }) => symbol === "BBCA");
  assert.deepEqual(holdings.map(({ holderKind }) => holderKind), ["entity", "public", "treasury"]);
  assert.equal(holdings[0].percentage, 0.54942);
  assert.equal(holdings[0].shares, 67729950000);
  assert.equal(holdings[0].value, 406379700000000);
  assert.equal(holdings[0].sourceId, page.source.id);
  assert.equal(bank.sourceIds[group.id], page.source.id);
  assert.equal(page.source.endpoint, group.path(0));
  assert.equal(page.source.credits, 0);
  assert.equal(page.source.retrievedAt, retrievedAt);
});

test("merges two groups by symbol despite row order, and preserves annual nulls", () => {
  const wide = fixtureGroup("wide-fields")[0];
  const annual = fixtureGroup("group-b")[0];
  const reordered = structuredClone(fixtures["group-b"]);
  reordered.results.reverse();
  const snapshot = mergeScreenerPages([
    parseScreenerPage(fixtures["wide-fields"], { group: wide, retrievedAt }),
    parseScreenerPage(reordered, { group: annual, retrievedAt }),
  ], { groups: [wide, annual], retrievedAt });
  assert.deepEqual(snapshot.companies.map(({ symbol }) => symbol), ["ADRO", "BBCA", "MGLV"]);
  const bank = snapshot.companies.find(({ symbol }) => symbol === "BBCA");
  assert.equal(bank.subSector, "Banks");
  assert.deepEqual(Object.keys(bank.sourceIds), [wide.id, annual.id]);
  const year = snapshot.years.find(({ symbol, year }) => symbol === "BBCA" && year === 2025);
  assert.equal(year.values.revenue, 112006326000000);
  assert.equal(year.values.totalDebt, 2395446000000);
  assert.equal(year.values.capitalExpenditure, null);
  assert.equal(year.values.pe, null);
  assert.deepEqual(Object.keys(year.sourceIds), [wide.id, annual.id]);
  assert.equal(snapshot.manifest.credits, 2);
});

test("keeps the probe's index arrays", () => {
  const group = fixtureGroup("kompas100")[0];
  const page = parseScreenerPage(fixtures.kompas100, { group, retrievedAt });
  assert.ok(page.companies.find(({ symbol }) => symbol === "BBCA").indices.includes("KOMPAS100"));
});

test("holder identities strip punctuation, PT and Tbk and collapse spaces", () => {
  assert.equal(holderKey("PT Dwimuria Investama Andalan"), holderKey("Dwimuria Investama Andalan"));
  assert.equal(holderKey("  PT.  Dwimuria, Investama   Andalan Tbk. "), "dwimuria investama andalan");
});

test("drops all-null periods after merging but keeps zero and negative values", () => {
  const groups = buildQueryGroups();
  const pages = groups.map((group) => {
    const body = fixtureResponse(group);
    for (const row of body.results) for (const field of group.fields.filter(({ scope }) => scope !== "company")) {
      row.query_values[field.field] = field.field === "revenue[2025]" ? 0 : field.field === "earnings[2025]" ? -1 : null;
    }
    return parseScreenerPage(body, { group, retrievedAt });
  });
  const snapshot = mergeScreenerPages(pages, { groups, retrievedAt });
  assert.equal(snapshot.years.length, 3);
  assert.equal(snapshot.quarters.length, 0);
  assert.ok(snapshot.years.every(({ year, values }) => year === 2025 && values.revenue === 0 && values.earnings === -1));
});

test("missing keys, duplicate symbols, malformed pages and broken pagination fail", () => {
  const group = buildQueryGroups()[0];
  const missing = fixtureResponse(group);
  delete missing.results[0].query_values.sector;
  assert.throws(() => parseScreenerPage(missing, { group, retrievedAt }), /missing query_values field sector/);
  const duplicate = fixtureResponse(group);
  duplicate.results[1] = duplicate.results[0];
  assert.throws(() => parseScreenerPage(duplicate, { group, retrievedAt }), /Duplicate symbol/);
  assert.throws(() => parseScreenerPage("<html>Error</html>", { group, retrievedAt }), /pagination JSON/);
  const truncated = fixtureResponse(group);
  truncated.results.pop();
  assert.throws(() => parseScreenerPage(truncated, { group, retrievedAt }), /Incomplete screener page/);
  const stuck = fixtureResponse(group, { totalCount: 201 });
  stuck.pagination.next_offset = 0;
  assert.throws(() => parseScreenerPage(stuck, { group, retrievedAt }), /pagination did not advance/);
});

test("holder kinds separate public and treasury labels from companies named Public", () => {
  const kinds = ["Public", "Other Public", "Public (Foreign)", "Treasury Stock", "PT Lautan Luas Tbk (Treasury)", "Bangkok Bank Public Company Limited", "PT Dwimuria Investama Andalan"].map((name) => holderKind(holderKey(name)));
  assert.deepEqual(kinds, ["public", "public", "public", "treasury", "treasury", "entity", "entity"]);
});
