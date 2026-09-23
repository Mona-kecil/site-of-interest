import assert from "node:assert/strict";
import test from "node:test";
import { buildRelativeVolume } from "./market-signals.mjs";

const source = { provider: "sectors", endpoint: "/v2/daily/XXXX/", retrievedAt: "2026-09-23T00:00:00Z" };
const membership = { empireSlug: "prajogo", companyName: "Example" };
const day = (n, volume) => ({ ticker: "XXXX", tradingDate: `2026-08-${String(n).padStart(2, "0")}`, volume, source });

test("uses exactly 20 prior rows and excludes the observation day", () => {
  const previous = Array.from({ length: 21 }, (_, index) => day(index + 1, 100));
  const signal = buildRelativeVolume(day(22, 400), previous, membership);
  assert.equal(signal.value, 4);
  assert.equal(signal.baselineAverage, 100);
  assert.equal(signal.baselineDays.length, 20);
  assert.equal(signal.baselineDays[0].tradingDate, "2026-08-02");
  assert.equal(signal.gap, null);
});

test("returns gaps for incomplete and zero baselines", () => {
  assert.match(buildRelativeVolume(day(3, 400), [day(1, 100), day(2, 100)], membership).gap, /Only 2 of 20/);
  const zero = buildRelativeVolume(day(22, 400), Array.from({ length: 20 }, (_, index) => day(index + 1, 0)), membership);
  assert.equal(zero.value, null);
  assert.equal(zero.gap, "Prior 20-day average volume is zero");
});
