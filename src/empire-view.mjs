const OWNERSHIP_KINDS = new Set(["control", "shareholding", "portfolio_investment", "group_affiliation", "group_membership"]);
const EVENT_KINDS = new Set(["services_contract", "former_ownership", "group_affiliation", "group_membership"]);

export function relationshipMatchesView(relationship, view) {
  if (view === "empire") return relationship.scope !== "boundary";
  if (view === "boundary") return relationship.scope === "boundary";
  if (view === "control") return relationship.control === "controlling";
  if (view === "minority") return relationship.control === "non_controlling";
  return true;
}

export function edgeTone(relationship) {
  if (relationship.status === "historical") return "history";
  if (relationship.control === "non_controlling" || relationship.kind === "portfolio_investment") return "passive";
  if (EVENT_KINDS.has(relationship.kind)) return "event";
  return "control";
}

export function formatMetric(metric) {
  if (metric.kind === "ownership_percent") return `${metric.value}%`;
  if (metric.unit === "shares") return `${trim(metric.value / 1_000_000)}m shares`;
  if (metric.unit === "IDR") return `Rp${trim(metric.value / 1_000_000_000_000)}tn`;
  if (metric.unit === "USD") return `$${trim(metric.value / 1_000_000_000)}bn`;
  return `${metric.value} ${metric.unit}`;
}

function trim(value) {
  return Number(value.toFixed(2)).toString();
}

export function relationshipLabel(relationship) {
  const ownership = relationship.metrics.find(({ kind }) => kind === "ownership_percent");
  const transaction = relationship.metrics.find(({ kind }) => kind === "transaction_value");
  const contract = relationship.metrics.find(({ kind }) => kind === "estimated_contract_value");

  if (transaction && ownership) return `${formatMetric(ownership)} acquired`;
  if (contract) return `${formatMetric(contract)} contract`;
  if (ownership && relationship.kind === "control") return `${formatMetric(ownership)} control`;
  if (ownership && relationship.kind === "portfolio_investment") return `${formatMetric(ownership)} portfolio`;
  if (ownership) return `${formatMetric(ownership)} holding`;
  if (relationship.kind === "group_membership") return "Sectors group member";
  if (relationship.kind === "group_affiliation") return "Inferred group link";
  if (relationship.kind === "former_ownership") return "Former owner";
  return relationship.kind.replaceAll("_", " ");
}

export function calculateLayeredTargets(corpus, width = 1000, height = 620) {
  const subjectId = corpus.manifest.subjectEntityId;
  const depthById = new Map([[subjectId, 0]]);
  const layers = [[subjectId]];
  const queue = [subjectId];

  while (queue.length > 0) {
    const from = queue.shift();
    const nextDepth = depthById.get(from) + 1;
    for (const relationship of corpus.relationships) {
      if (relationship.from !== from || relationship.status === "historical" || !OWNERSHIP_KINDS.has(relationship.kind)) continue;
      if (depthById.has(relationship.to)) continue;
      depthById.set(relationship.to, nextDepth);
      layers[nextDepth] ??= [];
      layers[nextDepth].push(relationship.to);
      queue.push(relationship.to);
    }
  }

  const missing = corpus.entities.filter(({ id }) => !depthById.has(id)).map(({ id }) => id);
  if (missing.length > 0) layers.push(missing);
  const top = 66;
  const bottom = 58;
  const usableHeight = height - top - bottom;
  const targets = new Map();

  const visualRows = layers.flatMap((ids) => {
    const rows = [];
    for (let index = 0; index < ids.length; index += 5) rows.push(ids.slice(index, index + 5));
    return rows;
  });

  visualRows.forEach((ids, depth) => {
    const y = top + (depth / Math.max(visualRows.length - 1, 1)) * usableHeight;
    ids.forEach((id, index) => {
      targets.set(id, { x: ((index + 1) / (ids.length + 1)) * width, y });
    });
  });

  return targets;
}

export function entitySourceIds(corpus, entityId) {
  const relationshipIds = new Set(corpus.relationships
    .filter(({ from, to }) => from === entityId || to === entityId)
    .map(({ id }) => id));
  const relationshipSourceIds = corpus.assertions
    .filter(({ relationshipId }) => relationshipIds.has(relationshipId))
    .flatMap(({ sourceRefs }) => sourceRefs.map(({ sourceId }) => sourceId));
  const factSourceIds = corpus.facts
    .filter(({ entityId: candidate }) => candidate === entityId)
    .flatMap(({ sourceRefs }) => sourceRefs.map(({ sourceId }) => sourceId));
  return [...new Set([...relationshipSourceIds, ...factSourceIds])];
}

export function groupProfileFacts(facts) {
  return Object.freeze(facts.reduce((groups, fact) => {
    (groups[fact.kind] ??= []).push(fact);
    return groups;
  }, {}));
}

export function formatProfileValue(value, unit) {
  if (unit === "IDR") {
    const sign = value < 0 ? "-" : "";
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000_000_000) return `${sign}Rp${trim(absolute / 1_000_000_000_000)}tn`;
    if (absolute >= 1_000_000_000) return `${sign}Rp${trim(absolute / 1_000_000_000)}bn`;
    if (absolute >= 1_000_000) return `${sign}Rp${trim(absolute / 1_000_000)}m`;
    return `${sign}Rp${absolute.toLocaleString("en-US")}`;
  }
  if (unit === "IDR_per_share") return `Rp${value.toLocaleString("en-US")}`;
  if (unit === "percent") return `${trim(value)}%`;
  if (unit === "multiple") return `${trim(value)}x`;
  return value.toLocaleString("en-US");
}

export function coverageSummary(corpus, entityId) {
  const entry = corpus.coverage.find(({ entityId: candidate }) => candidate === entityId);
  const checks = new Map(entry.checks.map((check) => [check.area, check.status]));
  const areas = corpus.manifest.coverageAreas.map((area) => ({ area, status: checks.get(area) ?? "unchecked" }));
  return {
    checked: areas.filter(({ status }) => status === "checked" || status === "not_applicable").length,
    total: areas.length,
    areas,
    frontier: entry.frontier
  };
}
