import { expect, test } from "vitest";
import type { Doc } from "../../../convex/_generated/dataModel";
import { aggregateBrokerFlow, compareBrokerFlow } from "./broker-flow-model";

type Day = Pick<Doc<"brokerDays">, "brokers">;

function broker(
  brokerCode: string,
  buyValue: number,
  sellValue: number,
  buyLots: number,
  sellLots: number,
): Day["brokers"][number] {
  return {
    brokerCode,
    buy: { frequency: 1, lots: buyLots, value: buyValue, averagePrice: null },
    sell: { frequency: 1, lots: sellLots, value: sellValue, averagePrice: null },
    net: { lots: buyLots - sellLots, value: buyValue - sellValue, averagePrice: null },
  };
}

function day(brokers: Day["brokers"]): Day {
  return { brokers };
}

test("aggregates each broker across observed dates without assigning intent", () => {
  const rows = aggregateBrokerFlow([
    day([broker("AA", 40, 10, 4, 1), broker("BB", 60, 70, 6, 7)]),
    day([broker("AA", 20, 30, 2, 3)]),
  ]);
  expect(rows).toMatchObject([
    {
      brokerCode: "AA",
      buyValue: 60,
      sellValue: 40,
      netValue: 20,
      buyLots: 6,
      sellLots: 4,
      netLots: 2,
      activeDays: 2,
      buyShare: 50,
    },
    { brokerCode: "BB", buyValue: 60, sellValue: 70, netValue: -10, activeDays: 1, buyShare: 50 },
  ]);
});

test("does not turn a zero denominator into a share", () => {
  expect(aggregateBrokerFlow([day([broker("AA", 0, 0, 0, 0)])])[0].buyShare).toBeNull();
});

test("compares buy share with an exact stored-session baseline", () => {
  const selected = [day([broker("AA", 40, 0, 4, 0), broker("BB", 60, 0, 6, 0)])];
  const baseline = [
    day([broker("AA", 10, 0, 1, 0), broker("BB", 90, 0, 9, 0)]),
    day([broker("AA", 30, 0, 3, 0), broker("BB", 70, 0, 7, 0)]),
  ];
  expect(compareBrokerFlow(selected, baseline, 2)[0]).toMatchObject({
    brokerCode: "BB",
    buyShare: 60,
    previousShare: 80,
    shareChangePoints: -20,
  });
  expect(compareBrokerFlow(selected, baseline.slice(0, 1), 2)[0].previousShare).toBeNull();
  expect(compareBrokerFlow([day([broker("CC", 100, 0, 10, 0)])], baseline, 2)[0]).toMatchObject({
    previousShare: 0,
    shareChangePoints: 100,
  });
});
