const ENTITY_KINDS = new Set(["person", "business_group", "listed_company", "private_company", "operating_company"]);
const ENTITY_SCOPE_ROLES = new Set(["empire", "boundary"]);
const RELATIONSHIP_KINDS = new Set(["control", "shareholding", "portfolio_investment", "group_affiliation", "group_membership", "services_contract", "former_ownership"]);
const GROUP_LINK_KINDS = new Set(["group_affiliation", "group_membership"]);
const DIRECTNESS = new Set(["direct", "indirect"]);
const CONTROL = new Set(["controlling", "non_controlling", "unknown", "not_applicable"]);
const RELATIONSHIP_STATUS = new Set(["current", "historical", "reported_position"]);
const RELATIONSHIP_SCOPES = new Set(["empire", "boundary"]);
const METRIC_KINDS = new Set(["ownership_percent", "shares", "transaction_value", "estimated_contract_value"]);
const METRIC_UNITS = new Set(["percent", "shares", "IDR", "USD"]);
const ASSERTION_TYPES = new Set(["fact", "party_claim", "inference"]);
const STANCES = new Set(["supports", "qualifies", "disputes"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);
const SOURCE_AUTHORITY = new Set(["data_provider"]);
const FRONTIER_STATUS = new Set(["active", "queued", "complete", "blocked"]);
const PRIORITY = new Set(["high", "medium", "low"]);
const CHECK_STATUS = new Set(["checked", "partial", "not_applicable"]);
const FACT_KINDS = new Set(["profile_metric", "financial_year", "valuation_period", "signal", "data_gap"]);
const FACT_UNITS = new Set(["IDR", "IDR_per_share", "count", "percent", "multiple"]);
const FILES = ["manifest", "entities", "relationships", "assertions", "sources", "coverage", "facts"];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function requireString(errors, value, path) {
  if (typeof value !== "string" || value.trim() === "") errors.push(`${path} must be a non-empty string`);
}

function requireDate(errors, value, path) {
  if (!isDate(value)) errors.push(`${path} must be an ISO date (YYYY-MM-DD)`);
}

function requireEnum(errors, value, allowed, path) {
  if (!allowed.has(value)) errors.push(`${path} has unsupported value ${JSON.stringify(value)}`);
}

function indexUnique(errors, records, collectionName) {
  const index = new Map();
  for (const [position, record] of records.entries()) {
    const path = `${collectionName}[${position}]`;
    if (!isRecord(record)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    requireString(errors, record.id, `${path}.id`);
    if (typeof record.id !== "string" || record.id === "") continue;
    if (index.has(record.id)) errors.push(`${path}.id duplicates ${record.id}`);
    index.set(record.id, record);
  }
  return index;
}

function ensureArray(errors, value, path) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  return value;
}

export function validateCorpus(raw) {
  const errors = [];
  const manifest = isRecord(raw.manifest) ? raw.manifest : {};
  const entities = ensureArray(errors, raw.entities, "entities");
  const relationships = ensureArray(errors, raw.relationships, "relationships");
  const assertions = ensureArray(errors, raw.assertions, "assertions");
  const sources = ensureArray(errors, raw.sources, "sources");
  const coverage = ensureArray(errors, raw.coverage, "coverage");
  const facts = ensureArray(errors, raw.facts, "facts");
  const entityById = indexUnique(errors, entities, "entities");
  const relationshipById = indexUnique(errors, relationships, "relationships");
  const assertionById = indexUnique(errors, assertions, "assertions");
  const sourceById = indexUnique(errors, sources, "sources");
  const factById = indexUnique(errors, facts, "facts");

  requireString(errors, manifest.id, "manifest.id");
  requireString(errors, manifest.name, "manifest.name");
  requireString(errors, manifest.subjectEntityId, "manifest.subjectEntityId");
  requireDate(errors, manifest.asOf, "manifest.asOf");
  if (manifest.dataPolicy !== "sectors_only") errors.push("manifest.dataPolicy must be sectors_only");
  if (!entityById.has(manifest.subjectEntityId)) errors.push(`manifest.subjectEntityId references missing entity ${manifest.subjectEntityId}`);
  const coverageAreas = ensureArray(errors, manifest.coverageAreas, "manifest.coverageAreas");
  const coverageAreaSet = new Set(coverageAreas);
  if (coverageAreaSet.size !== coverageAreas.length) errors.push("manifest.coverageAreas contains duplicates");

  for (const [position, entity] of entities.entries()) {
    if (!isRecord(entity)) continue;
    const path = `entities[${position}]`;
    requireEnum(errors, entity.kind, ENTITY_KINDS, `${path}.kind`);
    requireString(errors, entity.displayName, `${path}.displayName`);
    requireString(errors, entity.country, `${path}.country`);
    requireString(errors, entity.summary, `${path}.summary`);
    if (entity.scopeRole !== undefined) requireEnum(errors, entity.scopeRole, ENTITY_SCOPE_ROLES, `${path}.scopeRole`);
    if (entity.kind === "listed_company") {
      requireString(errors, entity.ticker, `${path}.ticker`);
      requireString(errors, entity.exchange, `${path}.exchange`);
    }
  }

  const assertionCountByRelationship = new Map();
  for (const [position, relationship] of relationships.entries()) {
    if (!isRecord(relationship)) continue;
    const path = `relationships[${position}]`;
    requireString(errors, relationship.from, `${path}.from`);
    requireString(errors, relationship.to, `${path}.to`);
    if (!entityById.has(relationship.from)) errors.push(`${path}.from references missing entity ${relationship.from}`);
    if (!entityById.has(relationship.to)) errors.push(`${path}.to references missing entity ${relationship.to}`);
    if (relationship.from === relationship.to) errors.push(`${path} cannot be a self-relationship`);
    requireEnum(errors, relationship.kind, RELATIONSHIP_KINDS, `${path}.kind`);
    requireEnum(errors, relationship.directness, DIRECTNESS, `${path}.directness`);
    requireEnum(errors, relationship.control, CONTROL, `${path}.control`);
    requireEnum(errors, relationship.scope, RELATIONSHIP_SCOPES, `${path}.scope`);
    requireEnum(errors, relationship.status, RELATIONSHIP_STATUS, `${path}.status`);
    if (relationship.status === "historical" && !relationship.validTo) errors.push(`${path}.validTo is required for a historical relationship`);
    if (relationship.validFrom !== undefined) requireDate(errors, relationship.validFrom, `${path}.validFrom`);
    if (relationship.validTo !== undefined) requireDate(errors, relationship.validTo, `${path}.validTo`);
    requireDate(errors, relationship.lastVerifiedAt, `${path}.lastVerifiedAt`);
    const metrics = ensureArray(errors, relationship.metrics, `${path}.metrics`);
    for (const [metricPosition, metric] of metrics.entries()) {
      const metricPath = `${path}.metrics[${metricPosition}]`;
      if (!isRecord(metric)) {
        errors.push(`${metricPath} must be an object`);
        continue;
      }
      requireEnum(errors, metric.kind, METRIC_KINDS, `${metricPath}.kind`);
      requireEnum(errors, metric.unit, METRIC_UNITS, `${metricPath}.unit`);
      if (typeof metric.value !== "number" || !Number.isFinite(metric.value) || metric.value < 0) errors.push(`${metricPath}.value must be a non-negative finite number`);
      if (metric.kind === "ownership_percent" && metric.value > 100) errors.push(`${metricPath}.value cannot exceed 100 percent`);
    }
  }

  for (const [position, assertion] of assertions.entries()) {
    if (!isRecord(assertion)) continue;
    const path = `assertions[${position}]`;
    if (!relationshipById.has(assertion.relationshipId)) errors.push(`${path}.relationshipId references missing relationship ${assertion.relationshipId}`);
    assertionCountByRelationship.set(assertion.relationshipId, (assertionCountByRelationship.get(assertion.relationshipId) ?? 0) + 1);
    requireEnum(errors, assertion.type, ASSERTION_TYPES, `${path}.type`);
    requireEnum(errors, assertion.stance, STANCES, `${path}.stance`);
    requireString(errors, assertion.statement, `${path}.statement`);
    requireDate(errors, assertion.asOf, `${path}.asOf`);
    requireEnum(errors, assertion.confidence, CONFIDENCE, `${path}.confidence`);
    if (assertion.type === "party_claim") {
      requireString(errors, assertion.speakerEntityId, `${path}.speakerEntityId`);
      if (!entityById.has(assertion.speakerEntityId)) errors.push(`${path}.speakerEntityId references missing entity ${assertion.speakerEntityId}`);
    }
    const sourceRefs = ensureArray(errors, assertion.sourceRefs, `${path}.sourceRefs`);
    if (sourceRefs.length === 0) errors.push(`${path}.sourceRefs must contain evidence`);
    for (const [sourcePosition, sourceRef] of sourceRefs.entries()) {
      const sourcePath = `${path}.sourceRefs[${sourcePosition}]`;
      if (!isRecord(sourceRef)) {
        errors.push(`${sourcePath} must be an object`);
        continue;
      }
      if (!sourceById.has(sourceRef.sourceId)) errors.push(`${sourcePath}.sourceId references missing source ${sourceRef.sourceId}`);
      requireString(errors, sourceRef.locator, `${sourcePath}.locator`);
    }
  }

  for (const relationshipId of relationshipById.keys()) {
    if (!assertionCountByRelationship.has(relationshipId)) errors.push(`relationship ${relationshipId} has no evidence assertion`);
  }

  for (const [position, source] of sources.entries()) {
    if (!isRecord(source)) continue;
    const path = `sources[${position}]`;
    requireString(errors, source.title, `${path}.title`);
    requireString(errors, source.publisher, `${path}.publisher`);
    requireString(errors, source.kind, `${path}.kind`);
    if (source.kind !== "api_response") errors.push(`${path}.kind must be api_response`);
    if (source.provider !== "sectors") errors.push(`${path}.provider must be sectors`);
    requireEnum(errors, source.authority, SOURCE_AUTHORITY, `${path}.authority`);
    if (source.publishedAt !== undefined) requireDate(errors, source.publishedAt, `${path}.publishedAt`);
    requireDate(errors, source.retrievedAt, `${path}.retrievedAt`);
    try {
      const url = new URL(source.url);
      if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("unsupported protocol");
      if (url.protocol !== "https:" || url.hostname !== "api.sectors.app") errors.push(`${path}.url must use the Sectors API host`);
    } catch {
      errors.push(`${path}.url must be an HTTP(S) URL`);
    }
  }

  for (const [position, fact] of facts.entries()) {
    if (!isRecord(fact)) continue;
    const path = `facts[${position}]`;
    if (!entityById.has(fact.entityId)) errors.push(`${path}.entityId references missing entity ${fact.entityId}`);
    requireEnum(errors, fact.kind, FACT_KINDS, `${path}.kind`);
    requireDate(errors, fact.asOf, `${path}.asOf`);
    if (fact.context !== undefined) requireString(errors, fact.context, `${path}.context`);
    const sourceRefs = ensureArray(errors, fact.sourceRefs, `${path}.sourceRefs`);
    if (sourceRefs.length === 0) errors.push(`${path}.sourceRefs must contain evidence`);
    for (const [sourcePosition, sourceRef] of sourceRefs.entries()) {
      const sourcePath = `${path}.sourceRefs[${sourcePosition}]`;
      if (!isRecord(sourceRef)) {
        errors.push(`${sourcePath} must be an object`);
        continue;
      }
      if (!sourceById.has(sourceRef.sourceId)) errors.push(`${sourcePath}.sourceId references missing source ${sourceRef.sourceId}`);
      requireString(errors, sourceRef.locator, `${sourcePath}.locator`);
    }
    if (fact.kind === "profile_metric") {
      requireString(errors, fact.label, `${path}.label`);
      requireEnum(errors, fact.unit, FACT_UNITS, `${path}.unit`);
      if (typeof fact.value !== "number" || !Number.isFinite(fact.value)) errors.push(`${path}.value must be a finite number`);
    } else if (fact.kind === "financial_year") {
      if (!Number.isInteger(fact.year) || fact.year < 1900) errors.push(`${path}.year must be a valid year`);
      requireEnum(errors, fact.unit, new Set(["IDR"]), `${path}.unit`);
      for (const field of ["revenue", "earnings", "operatingCashFlow", "freeCashFlow"]) {
        if (typeof fact[field] !== "number" || !Number.isFinite(fact[field])) errors.push(`${path}.${field} must be a finite number`);
      }
      for (const field of ["totalAssets", "totalDebt", "capitalExpenditure"]) {
        if (fact[field] !== undefined && (typeof fact[field] !== "number" || !Number.isFinite(fact[field]))) errors.push(`${path}.${field} must be a finite number when present`);
      }
    } else if (fact.kind === "valuation_period") {
      if (!Number.isInteger(fact.year) || fact.year < 1900) errors.push(`${path}.year must be a valid year`);
      for (const field of ["pe", "peerPe"]) {
        if (fact[field] !== null && (typeof fact[field] !== "number" || !Number.isFinite(fact[field]))) errors.push(`${path}.${field} must be a finite number or null`);
      }
    } else if (fact.kind === "signal") {
      requireString(errors, fact.label, `${path}.label`);
      requireString(errors, fact.metric, `${path}.metric`);
      requireEnum(errors, fact.unit, FACT_UNITS, `${path}.unit`);
      requireEnum(errors, fact.tone, new Set(["positive", "watch"]), `${path}.tone`);
      if (typeof fact.value !== "number" || !Number.isFinite(fact.value)) errors.push(`${path}.value must be a finite number`);
    } else if (fact.kind === "data_gap") {
      requireString(errors, fact.label, `${path}.label`);
    }
  }

  const coverageByEntityId = new Map();
  for (const [position, entry] of coverage.entries()) {
    const path = `coverage[${position}]`;
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    if (!entityById.has(entry.entityId)) errors.push(`${path}.entityId references missing entity ${entry.entityId}`);
    if (coverageByEntityId.has(entry.entityId)) errors.push(`${path}.entityId duplicates coverage for ${entry.entityId}`);
    coverageByEntityId.set(entry.entityId, entry);
    if (!isRecord(entry.frontier)) {
      errors.push(`${path}.frontier must be an object`);
    } else {
      requireEnum(errors, entry.frontier.status, FRONTIER_STATUS, `${path}.frontier.status`);
      requireEnum(errors, entry.frontier.priority, PRIORITY, `${path}.frontier.priority`);
      requireString(errors, entry.frontier.nextAction, `${path}.frontier.nextAction`);
    }
    const checks = ensureArray(errors, entry.checks, `${path}.checks`);
    const seenAreas = new Set();
    for (const [checkPosition, check] of checks.entries()) {
      const checkPath = `${path}.checks[${checkPosition}]`;
      if (!isRecord(check)) {
        errors.push(`${checkPath} must be an object`);
        continue;
      }
      if (!coverageAreaSet.has(check.area)) errors.push(`${checkPath}.area is not declared in manifest.coverageAreas`);
      if (seenAreas.has(check.area)) errors.push(`${checkPath}.area duplicates ${check.area}`);
      seenAreas.add(check.area);
      requireEnum(errors, check.status, CHECK_STATUS, `${checkPath}.status`);
      requireDate(errors, check.checkedAt, `${checkPath}.checkedAt`);
      requireString(errors, check.notes, `${checkPath}.notes`);
      const sourceIds = ensureArray(errors, check.sourceIds, `${checkPath}.sourceIds`);
      for (const sourceId of sourceIds) {
        if (!sourceById.has(sourceId)) errors.push(`${checkPath}.sourceIds references missing source ${sourceId}`);
      }
    }
  }
  for (const entityId of entityById.keys()) {
    if (!coverageByEntityId.has(entityId)) errors.push(`entity ${entityId} has no coverage record`);
  }

  return {
    errors,
    indexes: { entityById, relationshipById, assertionById, sourceById, factById, coverageByEntityId }
  };
}

function createCorpus(raw, indexes) {
  const assertionsByRelationshipId = new Map();
  for (const assertion of raw.assertions) {
    const assertions = assertionsByRelationshipId.get(assertion.relationshipId) ?? [];
    assertions.push(assertion);
    assertionsByRelationshipId.set(assertion.relationshipId, assertions);
  }

  return Object.freeze({
    ...raw,
    findPath(startEntityId, endEntityId, { includeGroupLinks = false } = {}) {
      if (!indexes.entityById.has(startEntityId) || !indexes.entityById.has(endEntityId)) return null;
      const queue = [{ entityId: startEntityId, path: [] }];
      const visited = new Set([startEntityId]);
      while (queue.length > 0) {
        const current = queue.shift();
        if (current.entityId === endEntityId) return current.path;
        for (const relationship of raw.relationships) {
          if (relationship.from !== current.entityId || relationship.status === "historical" || visited.has(relationship.to)) continue;
          if (!includeGroupLinks && GROUP_LINK_KINDS.has(relationship.kind)) continue;
          visited.add(relationship.to);
          queue.push({ entityId: relationship.to, path: [...current.path, relationship] });
        }
      }
      return null;
    },
    getRelationshipEvidence(relationshipId) {
      return assertionsByRelationshipId.get(relationshipId) ?? [];
    },
    getEntityProfile(entityId) {
      const entity = indexes.entityById.get(entityId);
      if (!entity) return null;
      return {
        entity,
        relationships: raw.relationships.filter(({ from, to }) => from === entityId || to === entityId),
        facts: raw.facts.filter((fact) => fact.entityId === entityId),
        coverage: indexes.coverageByEntityId.get(entityId)
      };
    },
    getCoverageGaps(entityId) {
      const entry = indexes.coverageByEntityId.get(entityId);
      if (!entry) return null;
      const checks = new Map(entry.checks.map((check) => [check.area, check]));
      return raw.manifest.coverageAreas
        .map((area) => checks.get(area) ?? { area, status: "unchecked" })
        .filter(({ status }) => status !== "checked" && status !== "not_applicable");
    },
    getEntity(entityId) {
      return indexes.entityById.get(entityId) ?? null;
    },
    getSource(sourceId) {
      return indexes.sourceById.get(sourceId) ?? null;
    }
  });
}

export function createEmpireCorpus(raw) {
  const validation = validateCorpus(raw);
  if (validation.errors.length > 0) {
    throw new Error(`Invalid empire corpus:\n- ${validation.errors.join("\n- ")}`);
  }
  return createCorpus(raw, validation.indexes);
}

export const CORPUS_FILE_NAMES = Object.freeze([...FILES]);
