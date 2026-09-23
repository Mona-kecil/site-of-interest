export function buildBrokerBuyShare(day, membership) {
  const totalBuyValue = day.brokers.reduce((sum, broker) => sum + broker.buy.value, 0);
  const ranked = day.brokers.slice().sort(
    (a, b) => b.buy.value - a.buy.value || a.brokerCode.localeCompare(b.brokerCode),
  );
  const top = ranked[0];
  if (!top || totalBuyValue === 0) return null;
  return {
    stableId: `broker-buy-share.v1:${day.ticker}:${day.tradingDate}`,
    empireSlug: membership.empireSlug,
    ticker: day.ticker,
    companyName: membership.companyName,
    tradingDate: day.tradingDate,
    brokerCode: top.brokerCode,
    metricId: "broker_buy_share",
    metricLabel: "Largest broker buy share",
    ruleVersion: "v1",
    formula: "broker buy value / sum of all broker buy values × 100",
    unit: "%",
    value: top.buy.value / totalBuyValue * 100,
    buyValue: top.buy.value,
    sellValue: top.sell.value,
    netValue: top.net.value,
    totalBuyValue,
    observedBrokers: day.brokers.length,
    source: day.source,
  };
}
