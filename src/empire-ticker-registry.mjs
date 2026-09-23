const MEMBERSHIP_EVIDENCE_KINDS = new Set([
  "provider_affiliate",
  "provider_group_label",
  "ownership_path",
]);

function uniqueEvidence(evidence) {
  const seen = new Set();
  return evidence.filter((item) => {
    const key = `${item.kind}:${item.sourceId}:${item.locator}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function evidenceKindForLocator(locator) {
  if (locator.includes("query_values.affiliates")) return "provider_affiliate";
  if (locator === "ownership.conglomerates_group") return "provider_group_label";
  return "ownership_path";
}

export function buildEmpireTickerRegistry({
  entities,
  relationships,
  assertions,
}) {
  const assertionsByRelationship = new Map();
  for (const assertion of assertions) {
    const current = assertionsByRelationship.get(assertion.relationshipId) ?? [];
    current.push(assertion);
    assertionsByRelationship.set(assertion.relationshipId, current);
  }

  const evidenceByEntity = new Map();
  for (const relationship of relationships) {
    if (relationship.scope !== "empire") continue;
    if (!["group_membership", "control", "shareholding"].includes(relationship.kind)) continue;

    const evidence = evidenceByEntity.get(relationship.to) ?? [];
    for (const assertion of assertionsByRelationship.get(relationship.id) ?? []) {
      for (const sourceRef of assertion.sourceRefs) {
        evidence.push({
          kind:
            relationship.kind === "group_membership"
              ? evidenceKindForLocator(sourceRef.locator)
              : "ownership_path",
          ...sourceRef,
        });
      }
    }
    evidenceByEntity.set(relationship.to, evidence);
  }

  return entities
    .filter(
      (entity) =>
        entity.kind === "listed_company" && entity.scopeRole !== "boundary",
    )
    .map((entity) => ({
      entityId: entity.id,
      ticker: entity.ticker,
      exchange: entity.exchange,
      companyName: entity.displayName,
      evidence: uniqueEvidence(evidenceByEntity.get(entity.id) ?? []),
    }))
    .sort((left, right) => left.ticker.localeCompare(right.ticker));
}

export function validateTickerRegistry(registry) {
  const errors = [];
  const seenTickers = new Set();

  for (const [index, entry] of registry.entries()) {
    const path = `memberships[${index}]`;
    if (typeof entry.entityId !== "string" || entry.entityId === "") {
      errors.push(`${path}.entityId must be a non-empty string`);
    }
    if (typeof entry.ticker !== "string" || entry.ticker === "") {
      errors.push(`${path}.ticker must be a non-empty string`);
    } else if (seenTickers.has(entry.ticker)) {
      errors.push(`${path}.ticker duplicates ${entry.ticker}`);
    } else {
      seenTickers.add(entry.ticker);
    }
    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
      errors.push(`${path}.evidence must contain at least one source reference`);
      continue;
    }
    for (const [evidenceIndex, evidence] of entry.evidence.entries()) {
      const evidencePath = `${path}.evidence[${evidenceIndex}]`;
      if (!MEMBERSHIP_EVIDENCE_KINDS.has(evidence.kind)) {
        errors.push(`${evidencePath}.kind has unsupported value ${JSON.stringify(evidence.kind)}`);
      }
      if (typeof evidence.sourceId !== "string" || evidence.sourceId === "") {
        errors.push(`${evidencePath}.sourceId must be a non-empty string`);
      }
      if (typeof evidence.locator !== "string" || evidence.locator === "") {
        errors.push(`${evidencePath}.locator must be a non-empty string`);
      }
    }
  }

  return errors;
}
