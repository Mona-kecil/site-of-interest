import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNewsResponse } from "./news-records.mjs";

const context = { tickers: ["CUAN", "SINI"], endpoint: "/v2/news/?symbols=CUAN%2CSINI", retrievedAt: "2026-09-23T00:00:00Z" };

test("matches only exact provider symbols and keeps sentiment tags out", () => {
  const response = {
    results: [{ title: "Example", source: "https://example.com/article", timestamp: "2026-09-04T12:55:00", symbols: ["CUAN.JK", "SINI.JK", "OTHER.JK"], tags: ["Bullish"] }],
    pagination: { has_next: false, next_offset: null, total_count: 1 },
  };
  const result = normalizeNewsResponse(response, context);
  assert.deepEqual(result.records[0].matchedTickers, ["CUAN", "SINI"]);
  assert.equal(result.records[0].matchRule, "provider_symbol_exact");
  assert.equal("tags" in result.records[0], false);
  assert.deepEqual(result, normalizeNewsResponse(response, context));
});

test("keeps unmatched articles out of the Empire feed", () => {
  const result = normalizeNewsResponse({ results: [{ title: "Other", source: "https://example.com/a", timestamp: "2026-09-04T12:55:00", symbols: ["OTHER.JK"] }], pagination: { has_next: false, next_offset: null, total_count: 1 } }, context);
  assert.equal(result.records.length, 0);
});
