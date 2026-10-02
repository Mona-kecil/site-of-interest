import { FIELD_DEFINITIONS, QUARTERS, YEARS } from "./fields.mjs";
import { buildQueryGroups } from "./groups.mjs";
import { fieldValue, holderKey } from "./screener.mjs";

export function validateUniverse(snapshot) {
  const fail = (message) => { throw new Error(message); };
  function finiteNumbers(value, path = "universe") {
    if (typeof value === "number" && !Number.isFinite(value)) fail(`${path} contains a non-finite number`);
    if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) finiteNumbers(item, `${path}.${key}`);
  }
  finiteNumbers(snapshot);
  for (const name of ["sources", "companies", "years", "quarters", "holdings"]) {
    if (!Array.isArray(snapshot[name])) fail(`${name} must be an array`);
  }
  const { manifest, sources, companies, years, quarters, holdings } = snapshot;
  if (!manifest || manifest.provider !== "sectors" || manifest.schemaVersion !== 1) fail("Invalid universe manifest");
  const groups = buildQueryGroups();
  const expectedGroups = groups.map(({ id, fields }) => ({ id, fields: fields.map(({ field }) => field) }));
  if (JSON.stringify(manifest.groups) !== JSON.stringify(expectedGroups)) fail("Manifest groups must match the field registry");
  if (JSON.stringify(manifest.years) !== JSON.stringify(YEARS) || JSON.stringify(manifest.quarters) !== JSON.stringify(QUARTERS)) fail("Manifest periods must match the field registry");
  if (typeof manifest.retrievedAt !== "string" || Number.isNaN(Date.parse(manifest.retrievedAt))) fail("Invalid manifest retrievedAt");
  const sourceMap = new Map();
  for (const source of sources) {
    if (typeof source.id !== "string" || !source.id || sourceMap.has(source.id)) fail(`Duplicate or invalid source ${source.id}`);
    if (source.provider !== "sectors" || typeof source.title !== "string" || !source.title || !source.endpoint?.startsWith("/v2/companies/?")) fail(`Invalid source ${source.id}`);
    if (typeof source.retrievedAt !== "string" || Number.isNaN(Date.parse(source.retrievedAt))) fail(`Invalid source retrievedAt ${source.id}`);
    if (!Number.isSafeInteger(source.credits) || source.credits < 0) fail(`Invalid credits for ${source.id}`);
    sourceMap.set(source.id, source);
  }
  if (manifest.credits !== sources.reduce((sum, source) => sum + source.credits, 0)) fail("Manifest credits do not match sources");
  const groupIds = new Set(groups.map(({ id }) => id));
  function checkSources(row, requiredGroups) {
    if (!row.sourceIds || typeof row.sourceIds !== "object" || Array.isArray(row.sourceIds)) fail(`${row.symbol} has no sourceIds`);
    for (const [groupId, sourceId] of Object.entries(row.sourceIds)) {
      if (!groupIds.has(groupId)) fail(`${row.symbol} references unknown group ${groupId}`);
      if (!sourceMap.has(sourceId)) fail(`${row.symbol} references unknown source ${sourceId}`);
      const source = sourceMap.get(sourceId);
      const params = new URL(source.endpoint, "https://api.sectors.app").searchParams;
      const group = groups.find(({ id }) => id === groupId);
      if (params.get("where") !== group.where) fail(`${row.symbol} source ${sourceId} does not belong to ${groupId}`);
    }
    for (const groupId of requiredGroups) if (!Object.hasOwn(row.sourceIds, groupId)) fail(`${row.symbol} missing from group ${groupId}`);
  }
  const symbols = new Set();
  for (const company of companies) {
    if (typeof company.symbol !== "string" || !/^[A-Z0-9]+$/.test(company.symbol)) fail("Invalid company symbol");
    if (symbols.has(company.symbol)) fail(`Duplicate symbol ${company.symbol}`);
    symbols.add(company.symbol);
    if (typeof company.name !== "string" || !company.name.trim()) fail(`${company.symbol} has no name`);
    checkSources(company, groupIds);
    for (const field of FIELD_DEFINITIONS.filter((field) => field.scope === "company" && field.target !== "holdings")) {
      const value = (field.target === "company" ? company : company.current)?.[field.key];
      fieldValue(value, field, `${company.symbol} ${field.key}`);
    }
    if (company.current.freeFloat !== null && (company.current.freeFloat < 0 || company.current.freeFloat > 1)) fail(`${company.symbol} freeFloat percentage outside 0..1`);
  }
  if (manifest.companyCount !== companies.length) fail("Manifest companyCount does not match companies");
  for (const scope of ["year", "quarter"]) {
    const seen = new Set();
    const fields = FIELD_DEFINITIONS.filter((field) => field.scope === scope);
    for (const row of scope === "year" ? years : quarters) {
      if (!symbols.has(row.symbol)) fail(`${row.symbol} has no company`);
      if (!manifest[`${scope}s`].includes(row[scope])) fail(`${row.symbol} ${scope} outside manifest: ${row[scope]}`);
      const key = `${row.symbol}:${row[scope]}`;
      if (seen.has(key)) fail(`Duplicate ${scope} row ${key}`);
      seen.add(key);
      if (!row.values || Object.keys(row.values).length !== fields.length) fail(`${key} has incomplete values`);
      for (const field of fields) fieldValue(row.values[field.key], field, `${key} ${field.key}`);
      if (Object.values(row.values).every((value) => value === null)) fail(`${key} has only null values`);
      const requiredGroups = groups.filter((group) => group.fields.some((field) => field.scope === scope && field.period === row[scope])).map(({ id }) => id);
      checkSources(row, requiredGroups);
    }
  }
  for (const row of holdings) {
    if (!symbols.has(row.symbol)) fail(`${row.symbol} holding has no company`);
    if (!sourceMap.has(row.sourceId)) fail(`${row.symbol} holding references unknown source ${row.sourceId}`);
    if (typeof row.holderName !== "string" || !row.holderName.trim() || row.holderKey !== holderKey(row.holderName) || !row.holderKey) fail(`${row.symbol} has an invalid holder identity`);
    if (!["entity", "public", "treasury"].includes(row.holderKind)) fail(`${row.symbol} has an invalid holderKind`);
    for (const key of ["percentage", "shares", "value"]) fieldValue(row[key], { unit: "ratio" }, `${row.symbol} holding ${key}`);
    if (row.percentage !== null && (row.percentage < 0 || row.percentage > 1)) fail(`${row.symbol} holder percentage outside 0..1`);
    const group = groups.find((group) => group.fields.some((field) => field.target === "holdings"));
    if (companies.find(({ symbol }) => symbol === row.symbol).sourceIds[group.id] !== row.sourceId) fail(`${row.symbol} holding source does not match its company`);
  }
  return { companies: companies.length, years: years.length, quarters: quarters.length, holdings: holdings.length, sources: sources.length, credits: manifest.credits };
}

export function universeCounts(counts) {
  return `${counts.companies} companies / ${counts.years} years / ${counts.quarters} quarters / ${counts.holdings} holdings / ${counts.sources} sources / ${counts.credits} credits`;
}
