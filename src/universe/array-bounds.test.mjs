import assert from "node:assert/strict";
import { test } from "node:test";
import { arrayBounds, IMPORT_ARRAY_CAP } from "./array-bounds.mjs";

test("array maxima cover each table and column, preserving empty arrays and ignoring nulls", () => {
  const tables = {
    companies: [{ symbol: "ONE", indices: ["A"], affiliates: null, checks: [1, 2] }, { symbol: "TWO", indices: ["A", "B"], affiliates: [], checks: [] }],
    companyYears: [{ symbol: "ONE", year: 2025, values: { earnings: 1 } }],
    companyQuarters: [],
    holdings: [{ symbol: "ONE", holderName: "Owner" }],
    universeSources: [{ id: "source" }],
    checkResults: [{ symbol: "ONE", checkId: "test", inputs: [1, 2, 3] }],
    owners: [{ key: "owner", holdings: [1, 2] }],
    businessGroups: [{ slug: "group", symbols: ["ONE"] }],
  };
  const original = structuredClone(tables);
  assert.deepEqual(arrayBounds(tables, IMPORT_ARRAY_CAP), {
    companies: { indices: 2, checks: 2, affiliates: 0 },
    companyYears: {}, companyQuarters: {}, holdings: {}, universeSources: {},
    checkResults: { inputs: 3 }, owners: { holdings: 2 }, businessGroups: { symbols: 1 },
  });
  assert.deepEqual(tables, original);
});

test("the import cap accepts 256 elements and rejects 257 with the table, column, row index and length", () => {
  assert.equal(IMPORT_ARRAY_CAP, 256);
  for (const [table, column, row] of [
    ["checkResults", "inputs", { symbol: "ASII", checkId: "cash_conversion" }],
    ["owners", "holdings", { key: "danantara asset management" }],
    ["businessGroups", "symbols", { slug: "salim" }],
    ["companies", "indices", { symbol: "ASII" }],
    ["companies", "affiliates", { symbol: "ASII" }],
    ["companies", "checks", { symbol: "ASII" }],
  ]) {
    assert.deepEqual(arrayBounds({ [table]: [{ ...row, [column]: Array(256).fill(null) }] }, IMPORT_ARRAY_CAP), { [table]: { [column]: 256 } });
    assert.throws(() => arrayBounds({ [table]: [{ ...row, [column]: Array(257).fill(null) }] }, IMPORT_ARRAY_CAP), { message: `${table}.${column}: row 0 has 257 elements (cap 256)` });
  }
});

test("array bounds accept a zero cap and reject nonempty arrays", () => {
  assert.deepEqual(arrayBounds({ empty: [{ values: [] }] }, 0), { empty: { values: 0 } });
  assert.throws(() => arrayBounds({ sources: [{ id: "source", tags: ["tag"] }] }, 0), /sources\.tags: row 0 has 1 elements \(cap 0\)/);
});
