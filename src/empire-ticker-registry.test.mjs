import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEmpireTickerRegistry,
  validateTickerRegistry,
} from "./empire-ticker-registry.mjs";

const entities = [
  { id: "brpt", kind: "listed_company", ticker: "BRPT", exchange: "IDX", displayName: "Barito Pacific" },
  { id: "nrca", kind: "listed_company", ticker: "NRCA", exchange: "IDX", displayName: "Nusa Raya Cipta" },
  { id: "raja", kind: "listed_company", ticker: "RAJA", exchange: "IDX", displayName: "Rukun Raharja", scopeRole: "boundary" },
];

const relationships = [
  { id: "group-brpt", to: "brpt", kind: "group_membership", scope: "empire" },
  { id: "ssia-nrca", to: "nrca", kind: "control", scope: "empire" },
  { id: "raja-ratu", to: "raja", kind: "control", scope: "boundary" },
];

const assertions = [
  {
    relationshipId: "group-brpt",
    sourceRefs: [
      { sourceId: "affiliate", locator: "results[symbol=BRPT.JK].query_values.affiliates" },
      { sourceId: "report", locator: "ownership.conglomerates_group" },
    ],
  },
  {
    relationshipId: "ssia-nrca",
    sourceRefs: [
      { sourceId: "descendants", locator: "results[symbol=NRCA.JK].query_values.major_shareholders_name" },
    ],
  },
];

test("builds the collection universe from classifications and ownership paths", () => {
  const registry = buildEmpireTickerRegistry({ entities, relationships, assertions });

  assert.deepEqual(registry, [
    {
      entityId: "brpt",
      ticker: "BRPT",
      exchange: "IDX",
      companyName: "Barito Pacific",
      evidence: [
        { kind: "provider_affiliate", sourceId: "affiliate", locator: "results[symbol=BRPT.JK].query_values.affiliates" },
        { kind: "provider_group_label", sourceId: "report", locator: "ownership.conglomerates_group" },
      ],
    },
    {
      entityId: "nrca",
      ticker: "NRCA",
      exchange: "IDX",
      companyName: "Nusa Raya Cipta",
      evidence: [
        { kind: "ownership_path", sourceId: "descendants", locator: "results[symbol=NRCA.JK].query_values.major_shareholders_name" },
      ],
    },
  ]);
});

test("keeps outside listed owners out of the collection universe", () => {
  const registry = buildEmpireTickerRegistry({ entities, relationships, assertions });

  assert.equal(registry.some(({ ticker }) => ticker === "RAJA"), false);
});

test("rejects duplicate tickers and entries without evidence", () => {
  const errors = validateTickerRegistry([
    { entityId: "a", ticker: "SAME", evidence: [] },
    {
      entityId: "b",
      ticker: "SAME",
      evidence: [{ kind: "provider_affiliate", sourceId: "source", locator: "field" }],
    },
  ]);

  assert.ok(errors.some((error) => error.includes("duplicates SAME")));
  assert.ok(errors.some((error) => error.includes("must contain at least one")));
});
