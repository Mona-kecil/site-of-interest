import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FIELD_DEFINITIONS } from "./fields.mjs";
import { definitions } from "./checks.mjs";
import { checkCell, formatInput, gapCategory, humanGap, inputLabel, sourceIdLine, sourceLine } from "./presentation.mjs";

const read = async (name) => JSON.parse(await readFile(new URL(`../../data/universe/${name}.json`, import.meta.url), "utf8"));
const result = { value: 2, percentile: 0.84, peerCount: 31, gap: null };

test("displayed registry questions use measurement language", () => {
  for (const definition of definitions) assert.doesNotMatch(definition.question, /\b(?:good|bad|buy|sell|healthy|weak|warning|threshold|cheap|expensive)\b/i);
  assert.equal(definitions.find(({ id }) => id === "fcf_yield").question, "What is free cash flow relative to the current market cap?");
});

test("check cells distinguish measured, few peers, gaps and non-applicability", () => {
  assert.deepEqual(checkCell(result, "multiple"), { state: "measured", text: "2.00×", peers: "p84 · 31 peers", reason: null });
  assert.deepEqual(checkCell({ ...result, value: 0, percentile: null, peerCount: 3 }, "multiple"), { state: "few-peers", text: "0.00×", peers: "3 peers · no percentile", reason: null });
  assert.deepEqual(checkCell(undefined, "percent"), { state: "does-not-apply", text: "Does not apply", peers: null, reason: null });
  assert.deepEqual(checkCell({ ...result, value: null, gap: "pe_ttm is zero or negative" }, "multiple"), { state: "gap", text: "Not meaningful", peers: null, reason: "Trailing P/E is zero or negative" });
  for (const [gap, category] of [
    ["Not reported: earnings[2025]", "Not reported"],
    ["No entity holdings reported", "Not reported"],
    ["Earnings sum is zero or negative", "Not meaningful"],
    ["2020 outstanding shares is zero", "Not meaningful"],
    ["Invested capital is zero or negative", "Not meaningful"],
    ["Calculation is not finite", "Not meaningful"],
    ["Fewer than 3 positive PE years reported", "Too little history"],
  ]) assert.equal(gapCategory(gap), category);
});

test("all registry entries have human labels and inputs put the fiscal year first", () => {
  for (const field of FIELD_DEFINITIONS) {
    assert.equal(typeof field.label, "string", field.key);
    assert.ok(field.label.length > 0, field.key);
    assert.doesNotMatch(field.label, /_|\[/, field.key);
  }
  assert.equal(inputLabel({ key: "operatingCashFlow", field: "operating_cash_flow[2023]", period: "2023" }), "Operating cash flow · FY2023");
  assert.equal(inputLabel({ key: "Bank Of Singapore Limited", field: "major_shareholders_name.share_percentage", period: "current" }), "Bank Of Singapore Limited · current stake");
});

test("gap reasons replace field codes, keep unknown patterns and name the history limit", () => {
  assert.equal(humanGap("Not reported: operating_cash_flow[2023], earnings[2024]"), "Operating cash flow FY2023 and earnings FY2024 not reported");
  assert.equal(humanGap("pb_mrq is zero or negative"), "Current P/B is zero or negative");
  assert.equal(humanGap("Fewer than 3 positive PE years reported"), "Fewer than 3 positive P/E years reported");
  assert.equal(humanGap("Not reported: unknown_field[2025]"), "Not reported: unknown_field[2025]");
  assert.equal(humanGap("Unrecognized provider reason"), "Unrecognized provider reason");
});

test("every distinct snapshot gap renders without snake case or brackets", async () => {
  const { results } = await read("checks");
  const gaps = new Set(results.flatMap(({ gap }) => gap ? [gap] : []));
  assert.ok(gaps.size > 0);
  const labels = new Map(FIELD_DEFINITIONS.map(({ providerField, label }) => [providerField, label.toLowerCase()]));
  for (const gap of gaps) {
    const text = humanGap(gap);
    assert.doesNotMatch(text, /[a-z]+_[a-z_]+|\[/, gap);
    if (!gap.startsWith("Not reported: ")) continue;
    const fields = gap.slice(14).split(", ").map((field) => /^(\w+)\[(\d{4})\]$/.exec(field));
    assert.equal(text.match(/FY\d{4}/g)?.length ?? 0, fields.filter(Boolean).length, gap);
    for (const field of fields) if (field) assert.ok(text.toLowerCase().includes(`${labels.get(field[1])} fy${field[2]}`), `${gap} keeps ${field[0]}`);
  }
});

test("input values use IDR billions, check units for ratios, and preserve null and zero", () => {
  assert.equal(inputLabel({ key: "totalDividend", field: "total_dividend[2025]", period: "2025" }), "Dividend per share · FY2025");
  for (const value of [91, 255, 444, 401, 249, 184]) assert.equal(formatInput(value, "total_dividend[2025]", "count"), `IDR ${value}.00 per share`);
  assert.equal(formatInput(null, "total_dividend[2025]", "count"), "Not reported");
  assert.equal(formatInput(19364410000000, "operating_cash_flow[2023]", "multiple"), "IDR 19,364.41 bn");
  assert.equal(formatInput(-2500000000, "capital_expenditure[2025]", "percent"), "IDR -2.50 bn");
  assert.equal(formatInput(0, "earnings[2025]", "multiple"), "IDR 0.00 bn");
  assert.equal(formatInput(null, "earnings[2025]", "multiple"), "Not reported");
  assert.equal(formatInput(0.84, "loan_to_deposit_ratio[2025]", "percent"), "84.00%");
  assert.equal(formatInput(2.5, "pe[2023]", "multiple"), "2.50×");
  assert.equal(formatInput(0.125, "free_float", "percent"), "12.50%");
  assert.equal(formatInput(0.125, "major_shareholders_name.share_percentage", "percent"), "12.50%");
  assert.equal(formatInput(123456789, "outstanding_shares[2025]", "percent"), "123,456,789");
});

test("source lines derive field batches, bounded row ranges and UTC dates from the snapshot", async () => {
  const sources = await read("sources");
  const manifest = await read("manifest");
  assert.equal(sourceLine(sources[0], manifest), "Sectors · /v2/companies/ · batch 1 of 10 · rows 1–200 · 2 Oct 2026");
  const last = sources.find(({ id }) => id === "universe-10-800");
  assert.equal(sourceLine(last, manifest), "Sectors · /v2/companies/ · batch 10 of 10 · rows 801–962 · 2 Oct 2026");
  assert.equal(sourceLine(sources.find(({ id }) => id === "universe-04-400"), manifest), "Sectors · /v2/companies/ · batch 4 of 10 · rows 401–600 · 2 Oct 2026");
  assert.doesNotMatch(sourceLine(last, manifest), /\?|where=|offset=/);
  assert.equal(sourceIdLine("universe-04-400", manifest), "Sectors · batch 4 of 10 · rows 401–600");
  assert.equal(sourceIdLine("universe-10-800", manifest), "Sectors · batch 10 of 10 · rows 801–962");
  assert.equal(sourceIdLine("unknown-source", manifest), "unknown-source");
  assert.ok(last.endpoint.length > 1000);
});
