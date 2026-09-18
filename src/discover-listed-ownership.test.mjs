import assert from "node:assert/strict";
import test from "node:test";
import { discoverListedOwnership, parseListedChildren } from "./discover-listed-ownership.mjs";

test("accepts only exact, bounded ownership records from Sectors", () => {
  const result = parseListedChildren({ results: [
    {
      symbol: "SINI.JK",
      company_name: "PT Singaraja Putra Tbk",
      query_values: { major_shareholders_name: [
        { name: "PT Petrosea Tbk", symbol: "PTRO.JK", share_percentage: "0.1988", share_amount: 239_105_000 }
      ] }
    },
    {
      symbol: "NOPE.JK",
      company_name: "Unrelated",
      query_values: { major_shareholders_name: [
        { name: "Similar name", symbol: "OTHER.JK", share_percentage: "0.5" }
      ] }
    },
    {
      symbol: "PTRO.JK",
      company_name: "Self edge",
      query_values: { major_shareholders_name: [
        { name: "PT Petrosea Tbk", symbol: "PTRO.JK", share_percentage: "1.2" }
      ] }
    }
  ] }, ["PTRO.JK"], "sectors-depth-2");

  assert.deepEqual(result.companies, [{ symbol: "SINI.JK", companyName: "PT Singaraja Putra Tbk" }]);
  assert.deepEqual(result.relationships, [{
    ownerSymbol: "PTRO.JK",
    ownerName: "PT Petrosea Tbk",
    companySymbol: "SINI.JK",
    sharePercentage: 0.1988,
    shareAmount: 239_105_000,
    sourceId: "sectors-depth-2"
  }]);
});

test("feeds a listed company found by mining back into shareholder discovery", async () => {
  const expanded = [];
  const result = await discoverListedOwnership({
    seeds: [
      { symbol: "CUAN.JK", companyName: "PT Petrindo Jaya Kreasi Tbk", depth: 1 },
      { symbol: "PTRO.JK", companyName: "PT Petrosea Tbk", depth: 2 }
    ],
    maxDepth: 6,
    maxCompanies: 50,
    expand: async (parents) => {
      expanded.push(parents.map(({ symbol }) => symbol));
      if (!parents.some(({ symbol }) => symbol === "PTRO.JK")) return { companies: [], relationships: [], source: null };
      return {
        companies: [{ symbol: "SINI.JK", companyName: "PT Singaraja Putra Tbk" }],
        relationships: [{ ownerSymbol: "PTRO.JK", companySymbol: "SINI.JK", sharePercentage: 0.1988, shareAmount: 239_105_000, sourceId: "sectors-listed-descendants-2" }],
        source: { id: "sectors-listed-descendants-2", title: "pass 2", path: "/v2/companies/" }
      };
    }
  });

  assert.ok(expanded.flat().includes("PTRO.JK"));
  assert.deepEqual(result.companies.map(({ symbol }) => symbol).sort(), ["CUAN.JK", "PTRO.JK", "SINI.JK"]);
  assert.deepEqual(result.relationships, [{ ownerSymbol: "PTRO.JK", companySymbol: "SINI.JK", sharePercentage: 0.1988, shareAmount: 239_105_000, sourceId: "sectors-listed-descendants-2" }]);
});

test("stops at the configured depth and company count", async () => {
  let calls = 0;
  const result = await discoverListedOwnership({
    seeds: [{ symbol: "ROOT.JK", companyName: "Root", depth: 0 }],
    maxDepth: 1,
    maxCompanies: 2,
    expand: async (parents) => {
      calls += 1;
      const owner = parents[0].symbol;
      return {
        companies: [
          { symbol: `${owner}-A`, companyName: "A" },
          { symbol: `${owner}-B`, companyName: "B" }
        ],
        relationships: [],
        source: null
      };
    }
  });

  assert.equal(calls, 1);
  assert.equal(result.companies.length, 2);
  assert.equal(result.truncated, true);
});
