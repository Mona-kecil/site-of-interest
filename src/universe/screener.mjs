import { emptyCompany, emptyValues, QUARTERS, YEARS } from "./fields.mjs";
import { buildQueryGroups, PAGE_SIZE } from "./groups.mjs";

export function holderKey(name) {
  return name.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim().replace(/^pt /, "").replace(/ tbk$/, "");
}

export function holderKind(key) {
  if (/^(?:other )?(?:public|public shareholders|public float|masyarakat)(?: foreign| domestic|\s+(?:below|less than|under)?\s*5)?$/.test(key)) return "public";
  if (/(?:^|\s)(?:treasury(?: stock| stocks| shares)?|saham treasuri|saham treasury)$/.test(key)) return "treasury";
  return "entity";
}

export function fieldValue(value, field, label = field.field ?? field.providerField) {
  if (value === null) return null;
  if (["IDR", "ratio", "fraction", "count"].includes(field.unit)) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a finite number or null`);
  } else if (field.unit === "list") {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`${label} must be a string array or null`);
  } else if (typeof value !== "string") {
    throw new Error(`${label} must be text or null`);
  }
  return value;
}

function normalizeHoldings(value, symbol, sourceId) {
  if (value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${symbol} major_shareholders_name must be an array or null`);
  return value.map((holder) => {
    if (typeof holder?.name !== "string" || !holder.name.trim()) throw new Error(`${symbol} holder has no name`);
    const key = holderKey(holder.name);
    if (!key) throw new Error(`${symbol} holder has no identity`);
    const rawPercentage = holder.share_percentage;
    const percentage = typeof rawPercentage === "string" && rawPercentage.trim() ? Number(rawPercentage) : rawPercentage;
    return {
      symbol,
      holderName: holder.name,
      holderKey: key,
      holderKind: holderKind(key),
      percentage: fieldValue(percentage, { unit: "fraction" }, `${symbol} percentage`),
      shares: fieldValue(holder.share_amount, { unit: "count" }, `${symbol} shares`),
      value: fieldValue(holder.share_value, { unit: "IDR" }, `${symbol} holding value`),
      sourceId,
    };
  });
}

export function parseScreenerPage(body, { group, retrievedAt, credits = 1 }) {
  if (!body || !Array.isArray(body.results) || !body.pagination) throw new Error("Screener page must contain results and pagination JSON");
  const { total_count: totalCount, offset, has_next: hasNext, next_offset: nextOffset } = body.pagination;
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) throw new Error("Invalid screener total_count");
  if (!Number.isSafeInteger(offset) || offset < 0 || typeof hasNext !== "boolean") throw new Error("Invalid screener pagination");
  const expectedRows = Math.min(PAGE_SIZE, Math.max(0, totalCount - offset));
  if (body.results.length !== expectedRows || hasNext !== (offset + expectedRows < totalCount)) throw new Error("Incomplete screener page");
  if (hasNext && nextOffset !== offset + PAGE_SIZE) throw new Error("Screener pagination did not advance by 200");
  const source = {
    id: `${group.id}-${offset}`,
    title: `IDX universe ${group.id}, offset ${offset}`,
    provider: "sectors",
    endpoint: group.path(offset),
    retrievedAt,
    credits,
  };
  const result = { source, companies: [], years: [], quarters: [], holdings: [], totalCount, offset, hasNext, nextOffset };
  const symbols = new Set();
  for (const item of body.results) {
    if (typeof item.symbol !== "string" || !/^[A-Z0-9]+(?:\.JK)?$/.test(item.symbol)) throw new Error("Invalid screener symbol");
    const symbol = item.symbol.replace(/\.JK$/, "");
    if (symbols.has(symbol)) throw new Error(`Duplicate symbol ${symbol} in ${group.id}`);
    symbols.add(symbol);
    if (typeof item.company_name !== "string" || !item.company_name.trim()) throw new Error(`${symbol} has no company_name`);
    if (!item.query_values || typeof item.query_values !== "object" || Array.isArray(item.query_values)) throw new Error(`${symbol} has no query_values`);
    const company = { symbol, name: item.company_name, current: {}, sourceIds: { [group.id]: source.id } };
    const periods = { year: new Map(), quarter: new Map() };
    for (const field of group.fields) {
      if (!Object.hasOwn(item.query_values, field.field)) throw new Error(`${symbol} missing query_values field ${field.field}`);
      const rawValue = item.query_values[field.field];
      if (field.target === "holdings") {
        result.holdings.push(...normalizeHoldings(rawValue, symbol, source.id));
        continue;
      }
      const value = fieldValue(rawValue, field, `${symbol} ${field.field}`);
      if (field.scope === "company") {
        (field.target === "company" ? company : company.current)[field.key] = value;
      } else {
        const rows = periods[field.scope];
        if (!rows.has(field.period)) rows.set(field.period, { symbol, [field.scope]: field.period, values: {}, sourceIds: { [group.id]: source.id } });
        rows.get(field.period).values[field.key] = value;
      }
    }
    result.companies.push(company);
    result.years.push(...periods.year.values());
    result.quarters.push(...periods.quarter.values());
  }
  return result;
}

export function mergeScreenerPages(pages, { groups = buildQueryGroups(), retrievedAt } = {}) {
  const companies = new Map();
  const periods = { year: new Map(), quarter: new Map() };
  const seen = new Set();
  const sources = [];
  const holdings = [];
  const totalCount = pages[0]?.totalCount ?? 0;
  for (const page of pages) {
    if (page.totalCount !== totalCount) throw new Error("Screener total_count changed between pages or groups");
    if (sources.some(({ id }) => id === page.source.id)) throw new Error(`Duplicate source ${page.source.id}`);
    sources.push(page.source);
    holdings.push(...page.holdings);
    for (const row of page.companies) {
      const groupId = Object.keys(row.sourceIds)[0];
      const key = `${groupId}:${row.symbol}`;
      if (seen.has(key)) throw new Error(`Duplicate symbol ${row.symbol} in ${groupId}`);
      seen.add(key);
      if (!companies.has(row.symbol)) companies.set(row.symbol, emptyCompany(row.symbol, row.name));
      const company = companies.get(row.symbol);
      if (company.name !== row.name) throw new Error(`${row.symbol} company_name changed between groups`);
      Object.assign(company.current, row.current);
      Object.assign(company.sourceIds, row.sourceIds);
      Object.assign(company, Object.fromEntries(Object.entries(row).filter(([key]) => !["current", "sourceIds"].includes(key))));
    }
    for (const scope of ["year", "quarter"]) {
      for (const row of page[`${scope}s`]) {
        const key = `${row.symbol}:${row[scope]}`;
        if (!periods[scope].has(key)) periods[scope].set(key, { symbol: row.symbol, [scope]: row[scope], values: emptyValues(scope), sourceIds: {} });
        const target = periods[scope].get(key);
        Object.assign(target.values, row.values);
        Object.assign(target.sourceIds, row.sourceIds);
      }
    }
  }
  if (companies.size !== totalCount) throw new Error(`Incomplete universe: expected ${totalCount} companies, got ${companies.size}`);
  const bySymbol = (a, b) => a.symbol.localeCompare(b.symbol);
  const reportedRows = (scope) => [...periods[scope].values()].filter((row) => Object.values(row.values).some((value) => value !== null));
  return {
    sources,
    companies: [...companies.values()].sort(bySymbol),
    years: reportedRows("year").sort((a, b) => bySymbol(a, b) || a.year - b.year),
    quarters: reportedRows("quarter").sort((a, b) => bySymbol(a, b) || QUARTERS.indexOf(a.quarter) - QUARTERS.indexOf(b.quarter)),
    holdings: holdings.sort((a, b) => bySymbol(a, b) || a.holderKey.localeCompare(b.holderKey)),
    manifest: {
      provider: "sectors",
      retrievedAt: retrievedAt ?? pages.at(-1)?.source.retrievedAt,
      companyCount: companies.size,
      groups: groups.map(({ id, fields }) => ({ id, fields: fields.map(({ field }) => field) })),
      years: [...YEARS],
      quarters: [...QUARTERS],
      credits: sources.reduce((sum, source) => sum + source.credits, 0),
      schemaVersion: 1,
    },
  };
}
