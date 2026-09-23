import type { Doc } from "../../../convex/_generated/dataModel";

type BrokerDay = Pick<Doc<"brokerDays">, "brokers">;

export function aggregateBrokerFlow(days: BrokerDay[]) {
  const totals = new Map<
    string,
    {
      brokerCode: string;
      buyValue: number;
      sellValue: number;
      buyLots: number;
      sellLots: number;
      activeDays: number;
    }
  >();
  for (const day of days) {
    for (const broker of day.brokers) {
      const current = totals.get(broker.brokerCode) ?? {
        brokerCode: broker.brokerCode,
        buyValue: 0,
        sellValue: 0,
        buyLots: 0,
        sellLots: 0,
        activeDays: 0,
      };
      current.buyValue += broker.buy.value;
      current.sellValue += broker.sell.value;
      current.buyLots += broker.buy.lots;
      current.sellLots += broker.sell.lots;
      current.activeDays += 1;
      totals.set(broker.brokerCode, current);
    }
  }
  const totalBuyValue = [...totals.values()].reduce((sum, broker) => sum + broker.buyValue, 0);
  return [...totals.values()]
    .map((broker) => ({
      ...broker,
      netValue: broker.buyValue - broker.sellValue,
      netLots: broker.buyLots - broker.sellLots,
      buyShare: totalBuyValue === 0 ? null : (broker.buyValue / totalBuyValue) * 100,
    }))
    .sort((a, b) => b.buyValue - a.buyValue || a.brokerCode.localeCompare(b.brokerCode));
}

export function compareBrokerFlow(
  selectedDays: BrokerDay[],
  baselineDays: BrokerDay[],
  baselineCount = 60,
) {
  const selected = aggregateBrokerFlow(selectedDays);
  const baseline = baselineDays.length === baselineCount ? aggregateBrokerFlow(baselineDays) : [];
  const baselineByBroker = new Map(baseline.map((row) => [row.brokerCode, row]));
  const hasBaseline =
    baselineDays.length === baselineCount && baseline.some((row) => row.buyShare !== null);
  return selected.map((row) => {
    const previousShare = hasBaseline
      ? (baselineByBroker.get(row.brokerCode)?.buyShare ?? 0)
      : null;
    return {
      ...row,
      previousShare,
      shareChangePoints:
        row.buyShare === null || previousShare === null ? null : row.buyShare - previousShare,
    };
  });
}
