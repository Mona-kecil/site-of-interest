import type { Infer } from "convex/values";
import { brokerRow } from "./schema";

type BrokerRow = Infer<typeof brokerRow>;

export function sameBrokerRows(first: readonly BrokerRow[], second: readonly BrokerRow[]): boolean {
  if (first.length !== second.length) return false;
  const byCode = new Map(first.map((row) => [row.brokerCode, row]));
  if (byCode.size !== first.length) return false;
  const seen = new Set<string>();
  for (const row of second) {
    if (seen.has(row.brokerCode)) return false;
    seen.add(row.brokerCode);
    const previous = byCode.get(row.brokerCode);
    if (
      previous === undefined ||
      previous.buy.frequency !== row.buy.frequency ||
      previous.buy.lots !== row.buy.lots ||
      previous.buy.value !== row.buy.value ||
      previous.buy.averagePrice !== row.buy.averagePrice ||
      previous.sell.frequency !== row.sell.frequency ||
      previous.sell.lots !== row.sell.lots ||
      previous.sell.value !== row.sell.value ||
      previous.sell.averagePrice !== row.sell.averagePrice ||
      previous.net.lots !== row.net.lots ||
      previous.net.value !== row.net.value ||
      previous.net.averagePrice !== row.net.averagePrice
    )
      return false;
  }
  return true;
}
