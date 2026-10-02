import assert from "node:assert/strict";
import test from "node:test";
import { fixtureSnapshot } from "./test-fixtures.mjs";
import { validateUniverse } from "./validate.mjs";

test("validates a merged offline snapshot and reports counts", () => {
  const counts = validateUniverse(fixtureSnapshot());
  assert.deepEqual(counts, { companies: 3, years: 21, quarters: 3, holdings: 8, sources: 10, credits: 10 });
});

const failures = [
  ["duplicate symbols", (data) => data.companies.push(structuredClone(data.companies[0])), /Duplicate symbol/],
  ["company missing from a group", (data) => delete data.companies[0].sourceIds[data.manifest.groups[4].id], /missing from group/],
  ["non-finite current number", (data) => { data.companies[0].current.marketCap = Infinity; }, /non-finite number/],
  ["non-finite annual number", (data) => { data.years[0].values.earnings = NaN; }, /non-finite number/],
  ["non-finite quarterly number", (data) => { data.quarters[0].values.revenueQ = -Infinity; }, /non-finite number/],
  ["percentage below zero", (data) => { data.holdings[0].percentage = -0.01; }, /percentage outside 0\.\.1/],
  ["percentage above one", (data) => { data.holdings[0].percentage = 1.01; }, /percentage outside 0\.\.1/],
  ["company references unknown source", (data) => { data.companies[0].sourceIds[data.manifest.groups[0].id] = "missing"; }, /unknown source/],
  ["year references unknown source", (data) => { data.years[0].sourceIds[data.manifest.groups[0].id] = "missing"; }, /unknown source/],
  ["quarter references unknown source", (data) => { data.quarters[0].sourceIds[data.manifest.groups[4].id] = "missing"; }, /unknown source/],
  ["holding references unknown source", (data) => { data.holdings[0].sourceId = "missing"; }, /unknown source/],
  ["year outside manifest", (data) => { data.years[0].year = 2018; }, /year outside manifest/],
  ["quarter outside manifest", (data) => { data.quarters[0].quarter = "Q3-2026"; }, /quarter outside manifest/],
  ["source belongs to wrong group", (data) => { data.companies[0].sourceIds[data.manifest.groups[0].id] = data.sources[1].id; }, /does not belong/],
  ["period missing provenance", (data) => { data.years[0].sourceIds = {}; }, /missing from group/],
  ["missing annual value", (data) => delete data.years[0].values.revenue, /incomplete values/],
  ["nulls replaced by undefined", (data) => { data.companies[0].current.peTtm = undefined; }, /finite number or null/],
  ["duplicate annual row", (data) => data.years.push(structuredClone(data.years[0])), /Duplicate year row/],
  ["duplicate quarterly row", (data) => data.quarters.push(structuredClone(data.quarters[0])), /Duplicate quarter row/],
];
for (const [name, mutate, pattern] of failures) test(`rejects ${name}`, () => {
  const data = fixtureSnapshot();
  mutate(data);
  assert.throws(() => validateUniverse(data), pattern);
});
