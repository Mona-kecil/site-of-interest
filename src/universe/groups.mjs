import { FIELD_DEFINITIONS, fieldReferences } from "./fields.mjs";

export const PAGE_SIZE = 200;
export const EXPECTED_COMPANIES = 962;
export const MAX_GROUP_REFERENCES = 28;
// Probes: a 1,983-character where clause worked; 6,521 characters returned an HTML error page.
export const MAX_WHERE_LENGTH = 2000;

const tautology = ({ field }) => `(${field} is not null or ${field} is null)`;
const whereClause = (fields) => fields.map(tautology).join(" and ");

function packReferences(references) {
  const packed = [[]];
  for (const reference of references) {
    const current = packed.at(-1);
    if (current.length === MAX_GROUP_REFERENCES || whereClause([...current, reference]).length > MAX_WHERE_LENGTH) packed.push([reference]);
    else current.push(reference);
  }
  return packed;
}

export function buildQueryGroups(registry = FIELD_DEFINITIONS) {
  const references = fieldReferences(registry);
  if (new Set(references.map(({ field }) => field)).size !== references.length) throw new Error("Duplicate field reference");
  return packReferences(references).map((fields, index) => {
    const where = whereClause(fields);
    return {
      id: `universe-${String(index + 1).padStart(2, "0")}`,
      fields,
      where,
      path(offset) {
        if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("offset must be a non-negative integer");
        const params = new URLSearchParams({ where, order_by: "symbol", limit: String(PAGE_SIZE), offset: String(offset), include_query_values: "true" });
        return `/v2/companies/?${params}`;
      },
    };
  });
}

export function worstCaseCredits(groups, companyCount = EXPECTED_COMPANIES) {
  return groups.length * Math.ceil(companyCount / PAGE_SIZE);
}
