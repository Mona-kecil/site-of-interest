import assert from "node:assert/strict";
import { test } from "node:test";
import { readUniverse } from "./files.mjs";
import { ownerKey, buildOwners, buildGroups, BUCKET_LABELS } from "./owners.mjs";

const holding = (holderName, percentage, extra = {}) => ({ symbol: "TEST", holderName, holderKind: "entity", percentage, shares: null, value: null, sourceId: "test", ...extra });

test("legal forms, punctuation, case and spacing merge real owner variants", () => {
  for (const [a, b] of [
    ["PT Danantara Asset Management (Persero)", "PT Danantara Asset Management"],
    ["PT. Asabri (Persero)", "Asabri (Persero),PT"],
    ["PT Astra International Tbk", "Astra International"],
    ["Bank Of Singapore Limited", "Bank Of Singapore Ltd."],
    ["  PT.  DANANTARA Asset Management Persero  ", "danantara asset management"],
    ["PT.Danantara Asset Management", "PT Danantara Asset Management"],
    ["P.T.Asabri (Persero)", "PT Asabri"],
  ]) assert.equal(ownerKey(a), ownerKey(b));
});

test("core names, people, legal words inside names and custodial accounts stay distinct", () => {
  for (const [a, b] of [
    ["PT Astra International Tbk", "PT Astra Otoparts Tbk"],
    ["PT Danantara Asset Management", "PT Danantara Investment Management"],
    ["Anthoni Salim", "Agus Salim"],
    ["Bank Of Singapore Limited", "Dbs Bank Ltd Sg-Pb Clients"],
    ["PT Bank Pan Indonesia Tbk", "PT Bank Panin Dubai Syariah Tbk"],
    ["Limited Resources", "Resources"],
  ]) assert.notEqual(ownerKey(a), ownerKey(b));
});

test("owners exclude public and treasury, classify explicit buckets, and resolve listed companies", () => {
  const owners = buildOwners({ companies: [{ symbol: "ASII", name: "PT Astra International Tbk" }], holdings: [
    holding("Astra International", 0.5), ...BUCKET_LABELS.map((name) => holding(name, 0.1)),
    holding("Public", 0.2, { holderKind: "public" }), holding("Treasury", 0.05, { holderKind: "treasury" }),
  ] });
  assert.equal(owners.length, 3);
  assert.deepEqual(BUCKET_LABELS, ["Afiliasi", "Afiliasi Pengendali"]);
  assert.equal(owners.filter(({ kind }) => kind === "bucket").length, 2);
  assert.equal(owners.find(({ key }) => key === "astra international").listedSymbol, "ASII");
});

test("ranks use entity percentages, share ties, retain zero, and leave missing ranks unreported", () => {
  const rows = [holding("First", 0.3, { value: 0 }), holding("Tie", 0.3), holding("Third", 0.1), holding("Missing", null), holding("Public", 0.7, { holderKind: "public" })];
  const owners = buildOwners({ companies: [], holdings: rows });
  assert.deepEqual(owners.map(({ name, holdings, totalValue }) => [name, holdings[0].rank, holdings[0].isLargest, totalValue]), [
    ["First", 1, true, 0], ["Missing", null, false, null], ["Third", 3, false, null], ["Tie", 1, true, null],
  ]);
});

test("ambiguous canonical listed names stay holders rather than selecting a symbol", () => {
  const [owner] = buildOwners({ companies: [{ symbol: "ONE", name: "PT Shared Name Tbk" }, { symbol: "TWO", name: "Shared Name Ltd" }], holdings: [holding("Shared Name", 0.1)] });
  assert.equal(owner.kind, "holder");
  assert.equal(owner.listedSymbol, null);
});

test("display name uses spelling frequency and a stable tie break; sums only reported values", () => {
  const snapshot = { companies: [], holdings: [holding("PT Owner", 0.1, { value: 10 }), holding("Owner", 0.2, { symbol: "TWO", value: null }), holding("PT Owner", 0.3, { symbol: "THREE", value: 20 })] };
  const [owner] = buildOwners(snapshot);
  assert.equal(owner.name, "PT Owner");
  assert.equal(owner.companyCount, 3);
  assert.equal(owner.totalValue, 30);
  assert.deepEqual(buildOwners({ ...snapshot, holdings: [...snapshot.holdings].reverse() }), [owner]);
  assert.equal(buildOwners({ companies: [], holdings: snapshot.holdings.slice(0, 2) })[0].name, "Owner");
});

test("groups preserve labels, unique membership, nulls and zero market caps", () => {
  const companies = [
    { symbol: "ZZZ", affiliates: ["Boy Thohir", "Salim", "Salim"], current: { marketCap: null } },
    { symbol: "AAA", affiliates: ["Salim"], current: { marketCap: 0 } },
    { symbol: "BBB", affiliates: null, current: { marketCap: 10 } },
  ];
  assert.deepEqual(buildGroups({ companies }), [
    { slug: "boy-thohir", label: "Boy Thohir", symbols: ["ZZZ"], totalMarketCap: null },
    { slug: "salim", label: "Salim", symbols: ["AAA", "ZZZ"], totalMarketCap: 0 },
  ]);
  assert.deepEqual(buildGroups({ companies: [...companies].reverse() }), buildGroups({ companies }));
});

test("real snapshot assigns every entity row once and preserves all holding sources", async () => {
  const snapshot = await readUniverse(new URL("../../data/universe", import.meta.url).pathname);
  const owners = buildOwners(snapshot);
  const sources = new Set(snapshot.sources.map(({ id }) => id));
  for (const row of snapshot.holdings) assert.ok(sources.has(row.sourceId), `${row.symbol}: ${row.sourceId}`);
  const identity = ({ symbol, percentage, shares, value, sourceId }) => JSON.stringify({ symbol, percentage, shares, value, sourceId });
  const expected = snapshot.holdings.filter(({ holderKind }) => holderKind === "entity").map((row) => `${ownerKey(row.holderName)}:${identity(row)}`).sort();
  const actual = owners.flatMap((owner) => owner.holdings.map((row) => {
    assert.ok(sources.has(row.sourceId), `${owner.key}: ${row.sourceId}`);
    return `${owner.key}:${identity(row)}`;
  })).sort();
  assert.deepEqual(actual, expected);
  assert.equal(owners.filter(({ key }) => key.includes("danantara")).length, 1);
  assert.equal(owners.find(({ key }) => key === "danantara asset management").companyCount, 13);
  assert.equal(owners.find(({ key }) => key === "astra international").listedSymbol, "ASII");
  assert.ok(buildGroups(snapshot).find(({ slug }) => slug === "salim").symbols.length >= 15);
  assert.deepEqual(buildOwners({ ...snapshot, companies: [...snapshot.companies].reverse(), holdings: [...snapshot.holdings].reverse() }), owners);
});
