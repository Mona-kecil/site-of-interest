import { expect, test } from "vitest";
import { latestCompletedBrokerWindow } from "./flowWindow";

test.each([
  ["2026-08-31T17:00:00.000Z", null],
  ["2026-09-14T16:59:59.000Z", null],
  ["2026-09-14T17:00:00.000Z", { start: "2026-09-01", end: "2026-09-14" }],
  ["2026-09-28T16:59:59.000Z", { start: "2026-09-01", end: "2026-09-14" }],
  ["2026-09-28T17:00:00.000Z", { start: "2026-09-15", end: "2026-09-28" }],
  ["2026-10-14T16:59:59.000Z", { start: "2026-09-15", end: "2026-09-28" }],
  ["2026-10-14T17:00:00.000Z", { start: "2026-10-01", end: "2026-10-14" }],
  ["2027-03-01T00:00:00.000Z", { start: "2027-02-15", end: "2027-02-28" }],
])("selects the latest completed Jakarta broker window at %s", (instant, expected) => {
  expect(latestCompletedBrokerWindow(new Date(instant))).toEqual(expected);
});

test("rejects an invalid timestamp", () => {
  expect(() => latestCompletedBrokerWindow(new Date("not-a-date"))).toThrow(
    "Invalid asOf timestamp",
  );
});
