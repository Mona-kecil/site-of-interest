import assert from "node:assert/strict";
import test from "node:test";
import { extractListedShareholders } from "./listed-shareholders.mjs";

test("keeps listed upstream owners as boundary entities", () => {
  const result = extractListedShareholders({
    knownEmpireSymbols: new Set(["SSIA.JK"]),
    reports: [
      {
        targetId: "ratu",
        sourceId: "sectors-ratu-report",
        majorShareholders: [{ name: "PT Rukun Raharja Tbk", symbol: "RAJA.JK", share_percentage: "0.6868" }]
      },
      {
        targetId: "nrca",
        sourceId: "sectors-nrca-report",
        majorShareholders: [
          { name: "PT Surya Semesta Internusa Tbk", symbol: "SSIA.JK", share_percentage: "0.6394" },
          { name: "PT Saratoga Investama Sedaya Tbk", symbol: "SRTG.JK", share_percentage: "0.0598" }
        ]
      }
    ]
  });

  assert.deepEqual(result.entities, [
    { id: "raja", displayName: "PT Rukun Raharja Tbk", ticker: "RAJA", scopeRole: "boundary" },
    { id: "srtg", displayName: "PT Saratoga Investama Sedaya Tbk", ticker: "SRTG", scopeRole: "boundary" }
  ]);
  assert.deepEqual(result.holdings.map(({ holderId, targetId, ownershipPercent, scope }) => ({ holderId, targetId, ownershipPercent, scope })), [
    { holderId: "raja", targetId: "ratu", ownershipPercent: 68.68, scope: "boundary" },
    { holderId: "ssia", targetId: "nrca", ownershipPercent: 63.94, scope: "empire" },
    { holderId: "srtg", targetId: "nrca", ownershipPercent: 5.98, scope: "boundary" }
  ]);
});
