const NON_ENTITY_NAMES = new Set(["public", "treasury stock", "treasury shares"]);
const CORPORATE_MARKERS = [
  /^pt\s/i,
  /\b(?:limited|ltd|pte|b\.v|gmbh|corporation|corp|inc|plc)\b/i
];

export function normalizeLegalName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function privateEntityId(name) {
  return `private-${normalizeLegalName(name).replaceAll(" ", "-")}`;
}

function isCorporateShareholder(name) {
  const normalized = normalizeLegalName(name);
  return normalized !== "" && !NON_ENTITY_NAMES.has(normalized) && CORPORATE_MARKERS.some((pattern) => pattern.test(name));
}

export function extractPrivateShareholders({ reports, empirePrivateEntities = new Map() }) {
  const entitiesById = new Map();
  const holdings = [];

  for (const report of reports) {
    for (const shareholder of report.majorShareholders ?? []) {
      if (shareholder.symbol || !isCorporateShareholder(shareholder.name)) continue;
      const normalizedName = normalizeLegalName(shareholder.name);
      const empireId = empirePrivateEntities.get(normalizedName);
      const holderId = empireId ?? privateEntityId(shareholder.name);
      const scope = empireId ? "empire" : "boundary";
      const sharePercentage = Number(shareholder.share_percentage);
      if (!Number.isFinite(sharePercentage)) continue;

      if (!entitiesById.has(holderId)) {
        entitiesById.set(holderId, { id: holderId, displayName: shareholder.name.trim(), scopeRole: scope });
      }
      holdings.push({
        holderId,
        targetId: report.targetId,
        ownershipPercent: Number((sharePercentage * 100).toFixed(5)),
        shareAmount: Number.isFinite(shareholder.share_amount) ? shareholder.share_amount : null,
        sourceId: report.sourceId,
        locator: `ownership.major_shareholders[name=${shareholder.name}]`,
        scope
      });
    }
  }

  return { entities: [...entitiesById.values()], holdings };
}
