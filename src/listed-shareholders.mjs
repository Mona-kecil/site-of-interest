const tickerOf = (symbol) => symbol.replace(/\.JK$/i, "").toUpperCase();
const entityIdForSymbol = (symbol) => tickerOf(symbol).toLowerCase();

export function extractListedShareholders({ reports, knownEmpireSymbols }) {
  const entitiesById = new Map();
  const holdings = [];

  for (const report of reports) {
    for (const shareholder of report.majorShareholders ?? []) {
      if (typeof shareholder.symbol !== "string") continue;
      const holderId = entityIdForSymbol(shareholder.symbol);
      if (holderId === report.targetId) continue;
      const sharePercentage = Number(shareholder.share_percentage);
      if (!Number.isFinite(sharePercentage)) continue;
      const scope = knownEmpireSymbols.has(shareholder.symbol) ? "empire" : "boundary";

      if (scope === "boundary" && !entitiesById.has(holderId)) {
        entitiesById.set(holderId, {
          id: holderId,
          displayName: shareholder.name.trim(),
          ticker: tickerOf(shareholder.symbol),
          scopeRole: "boundary"
        });
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
