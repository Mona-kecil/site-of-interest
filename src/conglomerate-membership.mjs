function includesExact(values, expected) {
  return Array.isArray(values) && values.some((value) => value === expected);
}

export function collectConglomerateMembership({
  affiliateName,
  groupName,
  affiliateSourceId,
  affiliateRows,
  reports,
  reportSourceId
}) {
  const bySymbol = new Map();
  const add = (symbol, sourceRef) => {
    if (typeof symbol !== "string" || symbol === "") return;
    const membership = bySymbol.get(symbol) ?? { symbol, sourceRefs: [] };
    if (!membership.sourceRefs.some(({ sourceId, locator }) => sourceId === sourceRef.sourceId && locator === sourceRef.locator)) {
      membership.sourceRefs.push(sourceRef);
    }
    bySymbol.set(symbol, membership);
  };

  for (const row of affiliateRows ?? []) {
    if (!includesExact(row.query_values?.affiliates, affiliateName)) continue;
    add(row.symbol, {
      sourceId: affiliateSourceId,
      locator: `results[symbol=${row.symbol}].query_values.affiliates`
    });
  }

  for (const [symbol, report] of reports ?? []) {
    if (!includesExact(report.body?.ownership?.conglomerates_group, groupName)) continue;
    add(symbol, { sourceId: reportSourceId(symbol), locator: "ownership.conglomerates_group" });
  }

  return [...bySymbol.values()];
}
