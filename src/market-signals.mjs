export function buildRelativeVolume(day, priorDays, membership) {
  const baseline = priorDays.slice(-20);
  const inputs = baseline.map((prior) => ({
    tradingDate: prior.tradingDate,
    volume: prior.volume,
    source: prior.source,
  }));
  const average = inputs.length === 20
    ? inputs.reduce((sum, input) => sum + input.volume, 0) / 20
    : null;
  const gap = inputs.length < 20
    ? `Only ${inputs.length} of 20 prior trading days are stored`
    : average === 0 ? "Prior 20-day average volume is zero" : null;
  return {
    stableId: `relative-volume-20.v1:${day.ticker}:${day.tradingDate}`,
    empireSlug: membership.empireSlug,
    ticker: day.ticker,
    companyName: membership.companyName,
    tradingDate: day.tradingDate,
    metricId: "relative_volume_20",
    metricLabel: "Volume / prior 20-day average",
    ruleVersion: "v1",
    formula: "observation-day volume / mean(volume of prior 20 stored trading days)",
    unit: "x",
    value: gap === null ? day.volume / average : null,
    gap,
    volume: day.volume,
    baselineAverage: average,
    baselineDays: inputs,
    source: day.source,
  };
}
