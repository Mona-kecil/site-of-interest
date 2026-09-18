import assert from "node:assert/strict";
import test from "node:test";
import { extractPrivateShareholders } from "./private-shareholders.mjs";

test("extracts corporate shareholders, deduplicates them, and excludes people and public float", () => {
  const result = extractPrivateShareholders({
    reports: [
      {
        targetId: "ptro",
        sourceId: "sectors-ptro-report",
        majorShareholders: [
          { name: "PT Kreasi Jasa Persada", share_percentage: "0.45328", share_amount: 457_892_300 },
          { name: "PT Caraka Reksa Optima", share_percentage: "0.24449", share_amount: 246_959_000 },
          { name: "Public", share_percentage: "0.30066" },
          { name: "Erwin Ciputra", share_percentage: "0.00115" }
        ]
      },
      {
        targetId: "sini",
        sourceId: "sectors-sini-report",
        majorShareholders: [
          { name: "PT Kreasi Jasa Persada", share_percentage: "0.079", share_amount: 94_940_000 },
          { name: "Ever Grace International Trading Limited", share_percentage: "0.0748", share_amount: 90_000_000 }
        ]
      }
    ],
    empirePrivateEntities: new Map([["pt kreasi jasa persada", "kjp"]])
  });

  assert.deepEqual(result.entities, [
    { id: "kjp", displayName: "PT Kreasi Jasa Persada", scopeRole: "empire" },
    { id: "private-pt-caraka-reksa-optima", displayName: "PT Caraka Reksa Optima", scopeRole: "boundary" },
    { id: "private-ever-grace-international-trading-limited", displayName: "Ever Grace International Trading Limited", scopeRole: "boundary" }
  ]);
  assert.deepEqual(result.holdings.map(({ holderId, targetId, ownershipPercent, scope }) => ({ holderId, targetId, ownershipPercent, scope })), [
    { holderId: "kjp", targetId: "ptro", ownershipPercent: 45.328, scope: "empire" },
    { holderId: "private-pt-caraka-reksa-optima", targetId: "ptro", ownershipPercent: 24.449, scope: "boundary" },
    { holderId: "kjp", targetId: "sini", ownershipPercent: 7.9, scope: "empire" },
    { holderId: "private-ever-grace-international-trading-limited", targetId: "sini", ownershipPercent: 7.48, scope: "boundary" }
  ]);
});
