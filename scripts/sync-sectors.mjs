import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmpireCorpus } from "../src/empire-corpus.mjs";
import { discoverListedOwnership, parseListedChildren } from "../src/discover-listed-ownership.mjs";
import { extractPrivateShareholders } from "../src/private-shareholders.mjs";
import { collectConglomerateMembership } from "../src/conglomerate-membership.mjs";
import { extractListedShareholders } from "../src/listed-shareholders.mjs";
import { createSectorsClient } from "../src/sectors-client.mjs";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, "data/empires/prajogo");
const cacheDirectory = resolve(root, ".cache/sectors");
const retrievedAt = new Date().toISOString().slice(0, 10);
const refresh = process.argv.includes("--refresh");
const sectors = await createSectorsClient({ root, cacheDirectory, refresh });
const { request, stats: requestStats } = sectors;

function screenerPath(where) {
  const parameters = new URLSearchParams({ where, order_by: "-market_cap", limit: "200", include_query_values: "true" });
  return `/v2/companies/?${parameters}`;
}

const tickerOf = (symbol) => symbol.replace(".JK", "");
const entityIdForSymbol = (symbol) => tickerOf(symbol).toLowerCase();
const reportSourceId = (symbol) => `sectors-${tickerOf(symbol).toLowerCase()}-report`;
const percent = (value) => Number((Number(value) * 100).toFixed(5));
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const normalizePercentage = (value) => finite(value) ? (Math.abs(value) <= 5 ? value * 100 : value) : null;
const exactShareholder = (row, name) => row.query_values?.major_shareholders_name?.find((holder) => holder.name.trim().toLowerCase() === name.trim().toLowerCase());

const rootDiscoveryPath = screenerPath("key_executives_name = 'Prajogo Pangestu' or major_shareholders_name like '%Prajogo Pangestu%'");
const rootDiscovery = await request(rootDiscoveryPath, 1);
const groupDiscoveryPath = screenerPath("affiliates in ['Barito']");
const groupDiscovery = await request(groupDiscoveryPath, 1);
const listedRelationships = [];
const directListedCompanies = [];
for (const row of rootDiscovery.results ?? []) {
  const holding = exactShareholder(row, "Prajogo Pangestu");
  if (!holding) continue;
  directListedCompanies.push({ symbol: row.symbol, companyName: row.company_name, depth: 1 });
  listedRelationships.push({
    from: "prajogo",
    to: entityIdForSymbol(row.symbol),
    holding,
    sourceId: "sectors-prajogo-discovery",
    locator: `results[symbol=${row.symbol}].query_values.major_shareholders_name`
  });
}

const miningSearchPath = "/v2/mining/companies/?keyword=CUAN&limit=10";
const miningSearch = await request(miningSearchPath, 1);
const miningCompany = miningSearch.results?.find(({ symbol }) => symbol === "CUAN.JK");
if (!miningCompany?.slug) throw new Error("Sectors mining search did not resolve CUAN.JK");
const miningSlug = encodeURIComponent(miningCompany.slug);
const miningDetailPath = `/v2/mining/companies/${miningSlug}/`;
const miningOwnershipPath = `/v2/mining/companies/ownership/${miningSlug}/`;
const miningSitesPath = `/v2/mining/sites/?company=${miningSlug}&limit=30`;
const [miningDetail, miningOwnership, miningSites] = await Promise.all([
  request(miningDetailPath, 1),
  request(miningOwnershipPath, 1),
  request(miningSitesPath, 1)
]);
const miningSubsidiaries = miningOwnership.subsidiaries ?? [];
const listedMiningCompanies = miningSubsidiaries.filter(({ symbol }) => symbol).map((subsidiary) => ({
  symbol: subsidiary.symbol,
  companyName: subsidiary.name,
  depth: 2
}));
const groupListedCompanies = (groupDiscovery.results ?? []).map(({ symbol, company_name: companyName }) => ({
  symbol,
  companyName,
  depth: 1
}));

const listedDiscovery = await discoverListedOwnership({
  seeds: [...directListedCompanies, ...listedMiningCompanies, ...groupListedCompanies],
  maxDepth: 6,
  maxCompanies: 50,
  expand: async (parents, depth) => {
    const parentSymbols = parents.map(({ symbol }) => symbol);
    const legalNames = [...new Set(parents.flatMap(({ companyName }) => {
      const names = [companyName, companyName.endsWith(".") ? companyName.slice(0, -1) : `${companyName}.`];
      if (!companyName.toLowerCase().startsWith("pt ")) names.push(`PT ${companyName}`);
      return names;
    }))];
    const where = legalNames.map((companyName) => `major_shareholders_name = '${companyName.replaceAll("'", "''")}'`).join(" or ");
    const path = screenerPath(where);
    const sourceId = `sectors-listed-descendants-${depth}`;
    const response = await request(path, 1);
    const { companies, relationships } = parseListedChildren(response, parentSymbols, sourceId);
    return {
      companies,
      relationships,
      source: { id: sourceId, title: `Listed-company descendant discovery at depth ${depth}`, path }
    };
  }
});
if (listedDiscovery.truncated) throw new Error("Listed ownership discovery hit its 50-company guardrail");
const listedBySymbol = new Map(listedDiscovery.companies.map((company) => [company.symbol, company]));
for (const relationship of listedDiscovery.relationships) {
  listedRelationships.push({
    key: `${relationship.ownerSymbol}->${relationship.companySymbol}`,
    from: entityIdForSymbol(relationship.ownerSymbol),
    to: entityIdForSymbol(relationship.companySymbol),
    holding: {
      name: relationship.ownerName,
      symbol: relationship.ownerSymbol,
      share_percentage: relationship.sharePercentage,
      share_amount: relationship.shareAmount
    },
    sourceId: relationship.sourceId,
    locator: `results[symbol=${relationship.companySymbol}].query_values.major_shareholders_name`
  });
}
const discoverySources = [
  { id: "sectors-prajogo-discovery", title: "Prajogo listed-company discovery", path: rootDiscoveryPath },
  { id: "sectors-barito-affiliates", title: "Barito affiliated-company discovery", path: groupDiscoveryPath },
  ...listedDiscovery.sources
];

const reports = new Map();
for (const { symbol } of listedBySymbol.values()) {
  const ticker = tickerOf(symbol);
  const path = `/v2/company/report/${ticker}/?sections=overview,ownership,financials,valuation`;
  reports.set(symbol, { path, body: await request(path, 4) });
}
const privateShareholders = extractPrivateShareholders({
  reports: [...reports].map(([symbol, { body }]) => ({
    targetId: entityIdForSymbol(symbol),
    sourceId: reportSourceId(symbol),
    majorShareholders: body.ownership?.major_shareholders ?? []
  })),
  empirePrivateEntities: new Map([["pt kreasi jasa persada", "kjp"]])
});
const reportShareholders = extractListedShareholders({
  reports: [...reports].map(([symbol, { body }]) => ({
    targetId: entityIdForSymbol(symbol),
    sourceId: reportSourceId(symbol),
    majorShareholders: body.ownership?.major_shareholders ?? []
  })),
  knownEmpireSymbols: new Set(listedBySymbol.keys())
});
const groupMemberships = collectConglomerateMembership({
  affiliateName: "Barito",
  groupName: "Barito Group",
  affiliateSourceId: "sectors-barito-affiliates",
  affiliateRows: groupDiscovery.results ?? [],
  reports,
  reportSourceId
});
const prdlPath = "/v2/company/report/PRDL/?sections=ownership";
const prdlOwnership = await request(prdlPath, 1);
const groupNewsParameters = new URLSearchParams({ extension: "idx", symbols: "CUAN,SINI", keyword: "through subsidiaries" });
const groupNewsPath = `/v2/news/?${groupNewsParameters}`;
const groupNews = await request(groupNewsPath, 1);
const groupNewsArticle = groupNews.results?.find(({ title }) => title.includes("Through Subsidiaries"));
if (!groupNewsArticle) throw new Error("Sectors news did not return the CUAN through-subsidiaries record used for the KJP inference");
if (!privateShareholders.entities.some(({ id }) => id === "kjp")) throw new Error("Sectors ownership reports did not return PT Kreasi Jasa Persada");

const source = (id, title, path) => ({ id, title, publisher: "Sectors", provider: "sectors", kind: "api_response", authority: "data_provider", retrievedAt, url: `https://api.sectors.app${path}` });
const sourceRef = (sourceId, locator) => [{ sourceId, locator }];
const sources = [
  ...discoverySources.map(({ id, title, path }) => source(id, title, path)),
  source("sectors-cuan-mining-search", "CUAN mining-company search", miningSearchPath),
  source("sectors-cuan-mining-detail", "CUAN mining-company detail", miningDetailPath),
  source("sectors-cuan-mining-ownership", "CUAN mining ownership", miningOwnershipPath),
  source("sectors-cuan-mining-sites", "CUAN mining sites", miningSitesPath),
  ...[...reports].map(([symbol, { path }]) => source(reportSourceId(symbol), `${tickerOf(symbol)} company report`, path)),
  source("sectors-prdl-ownership", "PRDL ownership section", prdlPath),
  source("sectors-cuan-sini-subsidiaries-news", "CUAN takeover through subsidiaries", groupNewsPath)
];

const entities = [
  { id: "prajogo", kind: "person", displayName: "Prajogo Pangestu", country: "Indonesia", summary: "Research subject. Every visible relationship is backed by a current Sectors response." },
  { id: "barito-group", kind: "business_group", displayName: "Barito Group", country: "Indonesia", summary: "Conglomerate classification returned by Sectors. Membership does not by itself prove ownership or control." }
];
for (const [symbol, { body: report }] of reports) {
  const ticker = tickerOf(symbol);
  const classification = [report.overview?.industry, report.overview?.sub_sector].filter(Boolean).join(" · ");
  entities.push({
    id: entityIdForSymbol(symbol), kind: "listed_company", displayName: report.company_name ?? listedBySymbol.get(symbol).companyName,
    ticker, exchange: "IDX", country: "Indonesia",
    summary: classification ? `${classification}. Profile and cycle data returned by Sectors.` : "Listed company profile returned by Sectors."
  });
}
const entityIds = new Set(entities.map(({ id }) => id));
for (const subsidiary of miningSubsidiaries) {
  const id = subsidiary.symbol ? entityIdForSymbol(subsidiary.symbol) : subsidiary.slug;
  if (entityIds.has(id)) continue;
  entities.push({ id, kind: "operating_company", displayName: subsidiary.name, country: "Indonesia", summary: `Sectors lists this as a ${subsidiary.percentage_ownership}% CUAN subsidiary.` });
  entityIds.add(id);
}
for (const privateEntity of privateShareholders.entities) {
  if (entityIds.has(privateEntity.id)) continue;
  entities.push({
    ...privateEntity,
    kind: "private_company",
    country: "Indonesia",
    summary: privateEntity.scopeRole === "empire"
      ? "Private group entity identified in Sectors ownership records. Its upstream group position remains explicit about inference and missing percentages."
      : "Corporate shareholder reported by Sectors. Kept as an outside boundary until separate Sectors evidence links it to the empire."
  });
  entityIds.add(privateEntity.id);
}
for (const listedEntity of reportShareholders.entities) {
  if (entityIds.has(listedEntity.id)) continue;
  entities.push({
    ...listedEntity,
    kind: "listed_company",
    exchange: "IDX",
    country: "Indonesia",
    summary: "Listed shareholder returned by a Sectors company report. Kept outside the empire until Sectors establishes group membership."
  });
  entityIds.add(listedEntity.id);
}

const relationships = [];
const assertions = [];
function addOwnership({ from, to, holding, sourceId, locator, label, scope = "empire" }) {
  const ownershipPercent = percent(holding.share_percentage);
  const relationshipId = `${from}-${to}`;
  if (relationships.some(({ id }) => id === relationshipId)) return;
  relationships.push({
    id: relationshipId, from, to, kind: ownershipPercent > 50 ? "control" : "shareholding", directness: "direct",
    control: ownershipPercent > 50 ? "controlling" : "non_controlling", scope, status: "reported_position", lastVerifiedAt: retrievedAt,
    metrics: [{ kind: "ownership_percent", value: ownershipPercent, unit: "percent" }, ...(finite(holding.share_amount) ? [{ kind: "shares", value: holding.share_amount, unit: "shares" }] : [])]
  });
  assertions.push({
    id: `assert-${relationshipId}`, relationshipId, type: "fact", stance: "supports", statement: label ?? `Sectors reports a ${ownershipPercent}% direct shareholding.`,
    asOf: retrievedAt, confidence: "high", sourceRefs: sourceRef(sourceId, locator)
  });
}
for (const relationship of listedRelationships) {
  const childSymbol = [...listedBySymbol.keys()].find((symbol) => entityIdForSymbol(symbol) === relationship.to);
  addOwnership({ ...relationship, label: `Sectors reports ${relationship.holding.name} with ${percent(relationship.holding.share_percentage)}% of ${listedBySymbol.get(childSymbol)?.companyName ?? relationship.to}.` });
}
for (const subsidiary of miningSubsidiaries) {
  addOwnership({
    from: "cuan", to: subsidiary.symbol ? entityIdForSymbol(subsidiary.symbol) : subsidiary.slug,
    holding: { share_percentage: Number(subsidiary.percentage_ownership) / 100 }, sourceId: "sectors-cuan-mining-ownership", locator: "subsidiaries",
    label: `Sectors lists ${subsidiary.name} as a ${subsidiary.percentage_ownership}% CUAN subsidiary.`
  });
}
for (const holding of privateShareholders.holdings) {
  addOwnership({
    from: holding.holderId,
    to: holding.targetId,
    holding: {
      share_percentage: holding.ownershipPercent / 100,
      ...(finite(holding.shareAmount) ? { share_amount: holding.shareAmount } : {})
    },
    sourceId: holding.sourceId,
    locator: holding.locator,
    scope: holding.scope,
    label: `Sectors reports ${entities.find(({ id }) => id === holding.holderId)?.displayName ?? holding.holderId} with ${holding.ownershipPercent}% of ${entities.find(({ id }) => id === holding.targetId)?.displayName ?? holding.targetId}.`
  });
}
for (const holding of reportShareholders.holdings) {
  addOwnership({
    from: holding.holderId,
    to: holding.targetId,
    holding: {
      share_percentage: holding.ownershipPercent / 100,
      ...(finite(holding.shareAmount) ? { share_amount: holding.shareAmount } : {})
    },
    sourceId: holding.sourceId,
    locator: holding.locator,
    scope: holding.scope,
    label: `Sectors reports ${entities.find(({ id }) => id === holding.holderId)?.displayName ?? holding.holderId} with ${holding.ownershipPercent}% of ${entities.find(({ id }) => id === holding.targetId)?.displayName ?? holding.targetId}.`
  });
}
relationships.push({
  id: "prajogo-barito-group",
  from: "prajogo",
  to: "barito-group",
  kind: "group_affiliation",
  directness: "indirect",
  control: "unknown",
  scope: "empire",
  status: "reported_position",
  lastVerifiedAt: retrievedAt,
  metrics: []
});
assertions.push({
  id: "assert-prajogo-barito-group",
  relationshipId: "prajogo-barito-group",
  type: "inference",
  stance: "supports",
  statement: "Sectors repeatedly co-tags listed companies with the Barito and Prajogo Pangestu affiliates. The graph uses Barito Group as the research-group container without treating it as a legal ownership entity.",
  asOf: retrievedAt,
  confidence: "high",
  sourceRefs: [{ sourceId: "sectors-barito-affiliates", locator: "results[*].query_values.affiliates" }]
});
for (const membership of groupMemberships) {
  const memberId = entityIdForSymbol(membership.symbol);
  const relationshipId = `barito-group-${memberId}`;
  relationships.push({
    id: relationshipId,
    from: "barito-group",
    to: memberId,
    kind: "group_membership",
    directness: "indirect",
    control: "unknown",
    scope: "empire",
    status: "reported_position",
    lastVerifiedAt: retrievedAt,
    metrics: []
  });
  assertions.push({
    id: `assert-${relationshipId}`,
    relationshipId,
    type: "fact",
    stance: "supports",
    statement: `Sectors classifies ${entities.find(({ id }) => id === memberId)?.displayName ?? membership.symbol} with Barito Group. This is group membership, not an ownership claim.`,
    asOf: retrievedAt,
    confidence: "high",
    sourceRefs: membership.sourceRefs
  });
}
relationships.push({
  id: "cuan-kjp",
  from: "cuan",
  to: "kjp",
  kind: "group_affiliation",
  directness: "indirect",
  control: "unknown",
  scope: "empire",
  status: "reported_position",
  lastVerifiedAt: retrievedAt,
  metrics: []
});
assertions.push({
  id: "assert-cuan-kjp",
  relationshipId: "cuan-kjp",
  type: "inference",
  stance: "supports",
  statement: "Sectors reports that CUAN is pursuing SINI through subsidiaries and separately lists KJP as a 7.9% SINI shareholder. This supports a CUAN-group link to KJP, but Sectors does not disclose CUAN's ownership percentage in KJP.",
  asOf: retrievedAt,
  confidence: "medium",
  sourceRefs: [
    { sourceId: "sectors-cuan-sini-subsidiaries-news", locator: "results[0].title" },
    { sourceId: reportSourceId("SINI.JK"), locator: "ownership.major_shareholders[name=PT Kreasi Jasa Persada]" }
  ]
});
const facts = [];
for (const [symbol, { body: report }] of reports) {
  const entityId = entityIdForSymbol(symbol);
  const sourceId = reportSourceId(symbol);
  const historicalFinancials = report.financials?.historical_financials ?? [];
  const validFinancials = historicalFinancials.filter((row) => [row.revenue, row.earnings, row.operating_cash_flow, row.free_cash_flow].every(finite));
  const latestFinancial = validFinancials.reduce((latest, row) => Number(row.year) > Number(latest?.year ?? 0) ? row : latest, null);
  const latestRatio = report.financials?.historical_financial_ratio?.find(({ year }) => Number(year) === Number(latestFinancial?.year));
  const profileMetrics = [
    ["market-cap", "Market cap", report.overview?.market_cap, "IDR", report.overview?.latest_close_date ?? retrievedAt, "overview.market_cap"],
    ["close", "Last close", report.overview?.last_close_price, "IDR_per_share", report.overview?.latest_close_date ?? retrievedAt, "overview.last_close_price"],
    ["employees", "Employees", report.overview?.employee_num, "count", retrievedAt, "overview.employee_num"],
    ["revenue", latestFinancial ? `${latestFinancial.year} revenue` : "Revenue", latestFinancial?.revenue, "IDR", latestFinancial ? `${latestFinancial.year}-12-31` : retrievedAt, `financials.historical_financials[year=${latestFinancial?.year}].revenue`],
    ["earnings", latestFinancial ? `${latestFinancial.year} earnings` : "Earnings", latestFinancial?.earnings, "IDR", latestFinancial ? `${latestFinancial.year}-12-31` : retrievedAt, `financials.historical_financials[year=${latestFinancial?.year}].earnings`],
    ["total-debt", latestFinancial ? `${latestFinancial.year} total debt` : "Total debt", latestFinancial?.total_debt, "IDR", latestFinancial ? `${latestFinancial.year}-12-31` : retrievedAt, `financials.historical_financials[year=${latestFinancial?.year}].total_debt`],
    ["cash", latestFinancial ? `${latestFinancial.year} cash` : "Cash", latestFinancial?.cash_and_equivalents, "IDR", latestFinancial ? `${latestFinancial.year}-12-31` : retrievedAt, `financials.historical_financials[year=${latestFinancial?.year}].cash_and_equivalents`],
    ["free-cash-flow", latestFinancial ? `${latestFinancial.year} free cash flow` : "Free cash flow", latestFinancial?.free_cash_flow, "IDR", latestFinancial ? `${latestFinancial.year}-12-31` : retrievedAt, `financials.historical_financials[year=${latestFinancial?.year}].free_cash_flow`]
  ];
  facts.push(...profileMetrics.filter(([, , value]) => finite(value)).map(([id, label, value, unit, asOf, locator]) => ({ id: `${entityId}-${id}`, entityId, kind: "profile_metric", label, value, unit, asOf, context: "Value returned by the Sectors company report.", sourceRefs: sourceRef(sourceId, locator) })));
  if (latestFinancial) facts.push(...validFinancials.filter(({ year }) => Number(year) >= Number(latestFinancial.year) - 4).map((row) => ({
    id: `${entityId}-financial-year-${row.year}`, entityId, kind: "financial_year", year: Number(row.year), revenue: row.revenue, earnings: row.earnings,
    operatingCashFlow: row.operating_cash_flow, freeCashFlow: row.free_cash_flow,
    ...(finite(row.total_assets) ? { totalAssets: row.total_assets } : {}), ...(finite(row.total_debt) ? { totalDebt: row.total_debt } : {}),
    ...(finite(row.capital_expenditure) ? { capitalExpenditure: row.capital_expenditure } : {}), unit: "IDR", asOf: `${row.year}-12-31`,
    context: "Annual financial history returned by Sectors.", sourceRefs: sourceRef(sourceId, `financials.historical_financials[year=${row.year}]`)
  })));
  facts.push(...(report.valuation?.historical_valuation ?? []).filter(({ year }) => Number.isInteger(Number(year))).map((row) => ({
    id: `${entityId}-valuation-${row.year}`, entityId, kind: "valuation_period", year: Number(row.year), pe: finite(row.pe) ? row.pe : null,
    peerPe: finite(row.pe_peer_avg) ? row.pe_peer_avg : null, asOf: retrievedAt, context: "Annual P/E and peer average returned by the Sectors valuation section.",
    sourceRefs: sourceRef(sourceId, `valuation.historical_valuation[year=${row.year}]`)
  })));
  const signalCandidates = [
    ["debt_to_equity", "Debt to equity", latestRatio?.leverage?.debt_to_equity_ratio, "multiple", "watch", "Higher leverage increases sensitivity to financing costs."],
    ["interest_coverage", "Interest coverage", latestRatio?.leverage?.interest_coverage_ratio, "multiple", "watch", "Operating earnings divided by reported interest expense."],
    ["operating_cash_flow_margin", "Operating cash-flow margin", finite(latestRatio?.liquidity?.operating_cash_flow_margin) ? latestRatio.liquidity.operating_cash_flow_margin * 100 : null, "percent", "watch", "Cash conversion against revenue."],
    ["yoy_quarter_revenue_growth", "Quarterly revenue growth", normalizePercentage(report.financials?.yoy_quarter_revenue_growth), "percent", "positive", "Latest year-on-year quarterly growth returned by Sectors."],
    ["yoy_quarter_earnings_growth", "Quarterly earnings growth", normalizePercentage(report.financials?.yoy_quarter_earnings_growth), "percent", "positive", "Latest year-on-year quarterly growth returned by Sectors."]
  ];
  facts.push(...signalCandidates.filter(([, , value]) => finite(value)).map(([metric, label, value, unit, tone, context]) => ({
    id: `${entityId}-signal-${metric}`, entityId, kind: "signal", metric, label, value, unit, tone: tone === "positive" && value < 0 ? "watch" : tone,
    asOf: retrievedAt, context: `${context} Analytical flag only, not an investment recommendation.`, sourceRefs: sourceRef(sourceId, `financials.${metric}`)
  })));
}

facts.push({
  id: "cuan-direct-site-gap", entityId: "cuan", kind: "data_gap", label: "Direct mining sites", asOf: retrievedAt,
  context: `Sectors returned ${miningDetail.mining_site_count ?? 0} direct sites and ${miningSites.results?.length ?? 0} filtered site rows for CUAN. Subsidiary-level site traversal remains open.`,
  sourceRefs: [{ sourceId: "sectors-cuan-mining-detail", locator: "mining_site_count" }, { sourceId: "sectors-cuan-mining-sites", locator: "results" }]
});
facts.push({
  id: "prajogo-prdl-gap", entityId: "prajogo", kind: "data_gap", label: "PRDL link not established", asOf: retrievedAt,
  context: `The current Sectors PRDL ownership section lists ${(prdlOwnership.ownership?.major_shareholders ?? []).length} major-shareholder rows and does not establish a Prajogo relationship. PRDL is therefore not drawn as an empire edge.`,
  sourceRefs: sourceRef("sectors-prdl-ownership", "ownership.major_shareholders")
});
facts.push({
  id: "kjp-upstream-gap",
  entityId: "kjp",
  kind: "data_gap",
  label: "Upstream ownership percentage unavailable",
  asOf: retrievedAt,
  context: "The CUAN-group link is an inference from two Sectors records. The current API does not provide CUAN's ownership percentage in KJP, so the graph does not label this as control or aggregate KJP's SINI stake into CUAN or PTRO.",
  sourceRefs: [
    { sourceId: "sectors-cuan-sini-subsidiaries-news", locator: "results[0].title" },
    { sourceId: reportSourceId("SINI.JK"), locator: "ownership.major_shareholders[name=PT Kreasi Jasa Persada]" }
  ]
});
facts.push({
  id: "ptro-ownership-layer-conflict",
  entityId: "ptro",
  kind: "data_gap",
  label: "Ownership records describe different layers or snapshots",
  asOf: retrievedAt,
  context: "Sectors' CUAN mining ownership response reports a 41.5% CUAN position in PTRO, while PTRO's company report lists KJP at 45.328%, Caraka Reksa Optima at 24.449%, and public holders at 30.066% without listing CUAN. These positions are shown as reported but must not be summed until Sectors exposes their dates and legal layers.",
  sourceRefs: [
    { sourceId: "sectors-cuan-mining-ownership", locator: "subsidiaries[name=Petrosea]" },
    { sourceId: reportSourceId("PTRO.JK"), locator: "ownership.major_shareholders" }
  ]
});
const concreteOwnershipKinds = new Set(["control", "shareholding", "portfolio_investment"]);
const ownershipReachable = new Set(["prajogo"]);
const pendingOwnership = ["prajogo"];
while (pendingOwnership.length > 0) {
  const from = pendingOwnership.shift();
  for (const relationship of relationships) {
    if (relationship.from !== from || !concreteOwnershipKinds.has(relationship.kind) || ownershipReachable.has(relationship.to)) continue;
    ownershipReachable.add(relationship.to);
    pendingOwnership.push(relationship.to);
  }
}
for (const membership of groupMemberships) {
  const entityId = entityIdForSymbol(membership.symbol);
  if (ownershipReachable.has(entityId)) continue;
  facts.push({
    id: `${entityId}-group-ownership-path-gap`,
    entityId,
    kind: "data_gap",
    label: "Group label has no Prajogo ownership path",
    asOf: retrievedAt,
    context: "Sectors classifies this company with Barito Group, but the loaded Sectors records do not establish a directed ownership path from Prajogo Pangestu. The graph therefore shows membership separately from ownership.",
    sourceRefs: membership.sourceRefs
  });
}

const coverageAreas = ["ownership", "financials", "market", "valuation", "physical_assets"];
const coverage = entities.map((entity) => {
  if (entity.id === "prajogo") return {
    entityId: entity.id, frontier: { status: "active", priority: "high", nextAction: "Re-run Sectors discovery when ownership coverage changes; keep unresolved links visible as gaps." },
    checks: [{ area: "ownership", status: "checked", checkedAt: retrievedAt, sourceIds: ["sectors-prajogo-discovery", "sectors-barito-affiliates", "sectors-prdl-ownership"], notes: "Direct exact-name holdings and Barito affiliations discovered; PRDL checked but not linked by the returned ownership data." }]
  };
  if (entity.id === "barito-group") return {
    entityId: entity.id,
    frontier: { status: "active", priority: "high", nextAction: "Reconcile every Sectors group member with a concrete ownership path or a named ownership gap." },
    checks: [{ area: "ownership", status: "partial", checkedAt: retrievedAt, sourceIds: ["sectors-barito-affiliates", ...groupMemberships.flatMap(({ sourceRefs }) => sourceRefs.map(({ sourceId }) => sourceId))].filter((sourceId, index, values) => values.indexOf(sourceId) === index), notes: "Membership is checked from Sectors affiliate and conglomerate-group fields; legal ownership paths remain a separate research task." }]
  };
  if (entity.kind === "listed_company" && entity.scopeRole === "boundary") {
    const sourceIds = [...new Set(reportShareholders.holdings.filter(({ holderId }) => holderId === entity.id).map(({ sourceId }) => sourceId))];
    return {
      entityId: entity.id,
      frontier: { status: "queued", priority: "medium", nextAction: "Load this listed boundary owner's Sectors report if its upstream role becomes material." },
      checks: [{ area: "ownership", status: "partial", checkedAt: retrievedAt, sourceIds, notes: "The downstream shareholding is checked; this outside listed owner's own group and financial profile are not loaded." }]
    };
  }
  if (entity.kind === "listed_company") {
    const sourceId = reportSourceId(`${entity.ticker}.JK`);
    return {
      entityId: entity.id, frontier: { status: "active", priority: "high", nextAction: entity.id === "cuan" ? "Traverse subsidiary-level mining sites and production records." : "Refresh the Sectors report and test the next valuation-cycle transition." },
      checks: [
        { area: "ownership", status: "checked", checkedAt: retrievedAt, sourceIds: [sourceId], notes: "Major-shareholder section loaded from Sectors." },
        { area: "financials", status: "checked", checkedAt: retrievedAt, sourceIds: [sourceId], notes: "Historical financials and latest growth fields loaded from Sectors." },
        { area: "market", status: "checked", checkedAt: retrievedAt, sourceIds: [sourceId], notes: "Latest market fields loaded from Sectors." },
        { area: "valuation", status: "checked", checkedAt: retrievedAt, sourceIds: [sourceId], notes: "Historical P/E and peer P/E loaded from Sectors." },
        { area: "physical_assets", status: "partial", checkedAt: retrievedAt, sourceIds: entity.id === "cuan" ? ["sectors-cuan-mining-detail", "sectors-cuan-mining-sites"] : [sourceId], notes: "Operating-asset traversal is not complete." }
      ]
    };
  }
  if (entity.id === "kjp") return {
    entityId: entity.id,
    frontier: { status: "active", priority: "high", nextAction: "Replace the inferred group link when Sectors exposes KJP's upstream ownership record." },
    checks: [{ area: "ownership", status: "partial", checkedAt: retrievedAt, sourceIds: ["sectors-cuan-sini-subsidiaries-news", ...new Set(privateShareholders.holdings.filter(({ holderId }) => holderId === entity.id).map(({ sourceId }) => sourceId))], notes: "KJP's PTRO and SINI stakes are checked; its upstream CUAN ownership percentage remains unavailable." }]
  };
  if (entity.scopeRole === "boundary") {
    const sourceIds = [...new Set(privateShareholders.holdings.filter(({ holderId }) => holderId === entity.id).map(({ sourceId }) => sourceId))];
    return {
      entityId: entity.id,
      frontier: { status: "queued", priority: "low", nextAction: "Search Sectors private-company records only if this outside shareholder becomes material to the empire thesis." },
      checks: [{ area: "ownership", status: "partial", checkedAt: retrievedAt, sourceIds, notes: "Corporate shareholder position loaded from a listed-company report; upstream ownership is not established." }]
    };
  }
  return { entityId: entity.id, frontier: { status: "queued", priority: "medium", nextAction: "Resolve this operating company through the relevant Sectors extension endpoints." }, checks: [{ area: "ownership", status: "partial", checkedAt: retrievedAt, sourceIds: ["sectors-cuan-mining-ownership"], notes: "Parent relationship loaded; downstream ownership and assets remain open." }] };
});

const corpus = {
  manifest: { id: "prajogo-sectors", name: "Prajogo Pangestu", subjectEntityId: "prajogo", jurisdiction: "ID", asOf: retrievedAt, status: "researching", scope: "Barito group membership, listed ownership paths, valuation cycles, financials, and the CUAN mining branch reachable in the Sectors REST API.", dataPolicy: "sectors_only", coverageAreas },
  entities, relationships, assertions, sources, coverage, facts
};

createEmpireCorpus(corpus);
await mkdir(outputDirectory, { recursive: true });
await Promise.all(Object.entries(corpus).map(([name, value]) => writeFile(resolve(outputDirectory, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`)));
console.log(`Synced ${entities.length} entities, ${relationships.length} relationships, and ${facts.length} facts from Sectors.`);
console.log(`Sectors usage: ${requestStats.remoteCalls} remote calls / ${requestStats.credits} credits; ${requestStats.cachedCalls} cache hits.`);
console.log(`Output: ${outputDirectory}`);
