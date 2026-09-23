import assert from "node:assert/strict";
import test from "node:test";
import { buildBrokerBuyShare } from "./broker-signals.mjs";

const membership = { empireSlug: "prajogo", companyName: "Example" };
const source = { provider: "sectors", endpoint: "/v2/broker-summary/XXXX/", retrievedAt: "2026-09-16T00:00:00Z" };
const row = (brokerCode, buy, sell) => ({ brokerCode, buy: { value: buy }, sell: { value: sell }, net: { value: buy - sell } });
const day = (brokers) => ({ ticker: "XXXX", tradingDate: "2026-09-16", source, brokers });

test("calculates a sourced buy share from every observed broker", () => {
  const signal = buildBrokerBuyShare(day([row("AB", 40, 10), row("CD", 60, 80)]), membership);
  assert.equal(signal.value, 60);
  assert.equal(signal.brokerCode, "CD");
  assert.equal(signal.netValue, -20);
  assert.equal(signal.totalBuyValue, 100);
  assert.equal(signal.observedBrokers, 2);
  assert.equal(signal.source.endpoint, source.endpoint);
  assert.deepEqual(signal, buildBrokerBuyShare(day([row("AB", 40, 10), row("CD", 60, 80)]), membership));
});

test("uses broker code as a stable tie-break and does not divide by zero", () => {
  assert.equal(buildBrokerBuyShare(day([row("CD", 50, 0), row("AB", 50, 0)]), membership).brokerCode, "AB");
  assert.equal(buildBrokerBuyShare(day([row("AB", 0, 0)]), membership), null);
  assert.equal(buildBrokerBuyShare(day([]), membership), null);
});
