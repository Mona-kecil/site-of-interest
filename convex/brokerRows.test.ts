import { expect, test } from "vitest";
import { sameBrokerRows } from "./brokerRows";

const row = (brokerCode: string) => ({
  brokerCode,
  buy: { frequency: 2, lots: 100, value: 1000, averagePrice: 10 },
  sell: { frequency: 1, lots: 40, value: 400, averagePrice: 10 },
  net: { lots: 60, value: 600, averagePrice: 10 },
});

test("compares independent broker rows regardless of row or object property order", () => {
  const first = [row("YP"), row("DX")];
  const reordered = [
    {
      net: { value: 600, averagePrice: 10, lots: 60 },
      sell: row("DX").sell,
      buy: row("DX").buy,
      brokerCode: "DX",
    },
    { net: row("YP").net, buy: row("YP").buy, brokerCode: "YP", sell: row("YP").sell },
  ];
  expect(sameBrokerRows(first, reordered)).toBe(true);
  expect(
    sameBrokerRows(first, [
      row("YP"),
      { ...row("DX"), net: { lots: 60, value: 601, averagePrice: 10 } },
    ]),
  ).toBe(false);
  expect(sameBrokerRows(first, [row("YP"), row("YP")])).toBe(false);
});
