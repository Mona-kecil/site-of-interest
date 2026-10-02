import { readFile } from "node:fs/promises";
import { FIELD_DEFINITIONS } from "./fields.mjs";
import { buildQueryGroups } from "./groups.mjs";
import { mergeScreenerPages, parseScreenerPage } from "./screener.mjs";

export const retrievedAt = "2026-10-02T06:42:00.000Z";
export const fixtures = Object.fromEntries(await Promise.all(["wide-fields", "group-b", "kompas100"].map(async (name) => [name, JSON.parse(await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"))])));

export function fixtureGroup(name) {
  const keys = Object.keys(fixtures[name].results[0].query_values);
  const registry = FIELD_DEFINITIONS.flatMap((definition) => {
    if (definition.scope === "company") return name !== "group-b" && keys.includes(definition.providerField) ? [definition] : [];
    const periods = definition.periods.filter((period) => keys.includes(`${definition.providerField}[${period}]`));
    return periods.length ? [{ ...definition, periods }] : [];
  });
  return buildQueryGroups(registry).map((group, index) => ({ ...group, id: `${name}-${index + 1}` }));
}

export function fixtureResponse(group, { offset = 0, totalCount = 3, reverse = false } = {}) {
  const rows = fixtures["wide-fields"].results;
  const results = Array.from({ length: Math.min(200, Math.max(0, totalCount - offset)) }, (_, index) => {
    const ordinal = offset + index;
    const base = rows[ordinal % rows.length];
    const other = fixtures["group-b"].results.find(({ symbol }) => symbol === base.symbol);
    const indices = fixtures.kompas100.results.find(({ symbol }) => symbol === base.symbol);
    const values = structuredClone({ ...base.query_values, ...other.query_values, ...indices?.query_values });
    const symbol = totalCount <= rows.length ? base.symbol : `TEST${String(ordinal).padStart(4, "0")}.JK`;
    return {
      symbol,
      company_name: base.company_name,
      query_values: Object.fromEntries(group.fields.map((field) => [field.field, Object.hasOwn(values, field.field) ? values[field.field] : field.scope === "quarter" && field.period === "Q2-2026" && field.key === "revenueQ" ? ordinal : null])),
    };
  });
  if (reverse) results.reverse();
  const hasNext = offset + results.length < totalCount;
  return { results, pagination: { total_count: totalCount, offset, showing: results.length, limit: 200, has_next: hasNext, next_offset: hasNext ? offset + 200 : null } };
}

export function fixtureSnapshot() {
  const groups = buildQueryGroups();
  const pages = groups.map((group) => parseScreenerPage(fixtureResponse(group), { group, retrievedAt }));
  return mergeScreenerPages(pages, { groups, retrievedAt });
}
