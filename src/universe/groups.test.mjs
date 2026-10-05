import assert from "node:assert/strict";
import test from "node:test";
import { FIELD_DEFINITIONS, fieldReferences, QUARTERS, YEARS } from "./fields.mjs";
import { buildQueryGroups, MAX_GROUP_REFERENCES, MAX_WHERE_LENGTH, worstCaseCredits } from "./groups.mjs";

test("registry covers the specified fields and periods", () => {
  assert.equal(FIELD_DEFINITIONS.length, 63);
  assert.deepEqual(YEARS, [2019, 2020, 2021, 2022, 2023, 2024, 2025]);
  assert.deepEqual(QUARTERS, ["Q3-2024", "Q4-2024", "Q1-2025", "Q2-2025", "Q3-2025", "Q4-2025", "Q1-2026", "Q2-2026"]);
  assert.equal(fieldReferences().length, 271);
  assert.equal(FIELD_DEFINITIONS.find(({ providerField }) => providerField === "employee_num").key, "employees");
  assert.deepEqual(FIELD_DEFINITIONS.filter(({ providerField }) => /dividend/.test(providerField)).map(({ providerField, scope }) => `${scope}:${providerField}`), ["company:dividend_ttm", "year:total_dividend"]);
  for (const field of FIELD_DEFINITIONS) {
    assert.ok(["company", "year", "quarter"].includes(field.scope));
    assert.ok(["IDR", "ratio", "fraction", "count", "date", "text", "list"].includes(field.unit));
  }
});

test("every expanded registry field appears in one group and one tautology", () => {
  const groups = buildQueryGroups();
  assert.equal(groups.length, 10);
  for (const [index, group] of groups.slice(0, -1).entries()) {
    const next = groups[index + 1].fields[0].field;
    const widened = `${group.where} and (${next} is not null or ${next} is null)`;
    assert.ok(group.fields.length === MAX_GROUP_REFERENCES || widened.length > MAX_WHERE_LENGTH, `${group.id} could hold one more field`);
  }
  const grouped = groups.flatMap(({ fields }) => fields.map(({ field }) => field));
  assert.deepEqual(grouped, fieldReferences().map(({ field }) => field));
  assert.equal(new Set(grouped).size, 271);
  for (const group of groups) {
    assert.ok(group.fields.length <= MAX_GROUP_REFERENCES);
    assert.ok(group.where.length <= MAX_WHERE_LENGTH);
    const clauses = group.where.split(" and ");
    assert.equal(clauses.length, group.fields.length);
    assert.equal(new Set(clauses).size, clauses.length);
    const nullChecks = [...group.where.matchAll(/\((\S+) is not null or (\S+) is null\)/g)];
    assert.deepEqual(nullChecks.map((match) => match[1]), group.fields.map(({ field }) => field));
    assert.ok(nullChecks.every((match) => match[1] === match[2]));
    const params = new URL(group.path(0), "https://offline.invalid").searchParams;
    assert.equal(params.get("where"), group.where);
    assert.equal(params.get("order_by"), "symbol");
    assert.equal(params.get("limit"), "200");
    assert.equal(params.get("offset"), "0");
    assert.equal(params.get("include_query_values"), "true");
    assert.equal(new URL(group.path(400), "https://offline.invalid").searchParams.get("offset"), "400");
    assert.throws(() => group.path(-1), /offset/);
  }
  assert.deepEqual(buildQueryGroups().map(({ id }) => id), groups.map(({ id }) => id));
  assert.equal(worstCaseCredits(groups), 50);
  assert.equal(worstCaseCredits(groups, 201), 20);
});

test("duplicate registry references fail before building a query", () => {
  assert.throws(() => buildQueryGroups([FIELD_DEFINITIONS[0], FIELD_DEFINITIONS[0]]), /Duplicate field reference/);
});
