export function parseListedChildren(response, parentSymbols, sourceId) {
  const parents = new Set(parentSymbols);
  const companies = new Map();
  const relationships = [];
  for (const row of Array.isArray(response?.results) ? response.results : []) {
    if (typeof row.symbol !== "string" || typeof row.company_name !== "string") continue;
    const holdings = row.query_values?.major_shareholders_name;
    if (!Array.isArray(holdings)) continue;
    const holding = holdings.find(({ symbol }) => parents.has(symbol));
    if (!holding?.symbol || holding.symbol === row.symbol) continue;
    const sharePercentage = Number(holding.share_percentage);
    if (!Number.isFinite(sharePercentage) || sharePercentage <= 0 || sharePercentage > 1) continue;
    companies.set(row.symbol, { symbol: row.symbol, companyName: row.company_name });
    relationships.push({
      ownerSymbol: holding.symbol,
      ownerName: holding.name,
      companySymbol: row.symbol,
      sharePercentage,
      shareAmount: holding.share_amount,
      sourceId
    });
  }
  return { companies: [...companies.values()], relationships };
}

export async function discoverListedOwnership({ seeds, expand, maxDepth, maxCompanies }) {
  const companyBySymbol = new Map();
  const depthBySymbol = new Map();
  const pending = [];
  const visited = new Set();
  const relationships = [];
  const relationshipKeys = new Set();
  const sources = [];
  const sourceIds = new Set();
  let truncated = false;

  for (const seed of seeds) {
    if (companyBySymbol.has(seed.symbol)) continue;
    if (companyBySymbol.size >= maxCompanies) {
      truncated = true;
      break;
    }
    companyBySymbol.set(seed.symbol, { symbol: seed.symbol, companyName: seed.companyName });
    depthBySymbol.set(seed.symbol, seed.depth);
    pending.push(seed.symbol);
  }

  while (pending.length > 0) {
    const nextDepth = Math.min(...pending.map((symbol) => depthBySymbol.get(symbol)));
    const symbols = pending.filter((symbol) => depthBySymbol.get(symbol) === nextDepth && !visited.has(symbol));
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (symbols.includes(pending[index])) pending.splice(index, 1);
    }
    for (const symbol of symbols) visited.add(symbol);
    if (nextDepth >= maxDepth || symbols.length === 0) continue;

    const parents = symbols.map((symbol) => companyBySymbol.get(symbol));
    const expansion = await expand(parents, nextDepth);
    if (expansion.source && !sourceIds.has(expansion.source.id)) {
      sourceIds.add(expansion.source.id);
      sources.push(expansion.source);
    }

    const childDepthBySymbol = new Map();
    for (const relationship of expansion.relationships) {
      const key = `${relationship.ownerSymbol}->${relationship.companySymbol}`;
      if (relationshipKeys.has(key)) continue;
      relationshipKeys.add(key);
      relationships.push(relationship);
      const ownerDepth = depthBySymbol.get(relationship.ownerSymbol);
      if (ownerDepth !== undefined) childDepthBySymbol.set(relationship.companySymbol, ownerDepth + 1);
    }

    for (const company of expansion.companies) {
      if (companyBySymbol.has(company.symbol)) continue;
      if (companyBySymbol.size >= maxCompanies) {
        truncated = true;
        continue;
      }
      const depth = childDepthBySymbol.get(company.symbol) ?? nextDepth + 1;
      companyBySymbol.set(company.symbol, company);
      depthBySymbol.set(company.symbol, depth);
      pending.push(company.symbol);
    }
  }

  return {
    companies: [...companyBySymbol.values()],
    relationships,
    sources,
    truncated
  };
}
