import assert from "node:assert/strict";
import test from "node:test";
import { collectConglomerateMembership } from "./conglomerate-membership.mjs";

test("unions affiliate search and report group labels without inventing ownership", () => {
  const memberships = collectConglomerateMembership({
    affiliateName: "Barito",
    groupName: "Barito Group",
    affiliateSourceId: "sectors-barito-affiliates",
    affiliateRows: [
      { symbol: "RATU.JK", query_values: { affiliates: ["Barito", "Prajogo Pangestu"] } },
      { symbol: "OTHER.JK", query_values: { affiliates: ["Another Group"] } }
    ],
    reports: new Map([
      ["RATU.JK", { body: { ownership: { conglomerates_group: ["Barito Group"] } } }],
      ["SINI.JK", { body: { ownership: { conglomerates_group: ["Rukun Raharja Group", "Barito Group"] } } }],
      ["OTHER.JK", { body: { ownership: { conglomerates_group: ["Another Group"] } } }]
    ]),
    reportSourceId: (symbol) => `sectors-${symbol.toLowerCase()}-report`
  });

  assert.deepEqual(memberships, [
    {
      symbol: "RATU.JK",
      sourceRefs: [
        { sourceId: "sectors-barito-affiliates", locator: "results[symbol=RATU.JK].query_values.affiliates" },
        { sourceId: "sectors-ratu.jk-report", locator: "ownership.conglomerates_group" }
      ]
    },
    {
      symbol: "SINI.JK",
      sourceRefs: [{ sourceId: "sectors-sini.jk-report", locator: "ownership.conglomerates_group" }]
    }
  ]);
});
