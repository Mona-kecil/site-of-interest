const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

// Holder-name hints only: named intermediaries, account qualifiers, and custody terms.
// Ddbs is a DBS spelling present in the provider snapshot; BP2S is BNP Paribas Securities Services.
const custodianPatterns = [
  /\bbank of singapore\b/i,
  /\buob kay hian\b/i,
  /\bjulius baer\b/i,
  /\bd?dbs bank\b/i,
  /\bcitibank\b/i,
  /\bbp2s\b/i,
  /\b(?:s\s*\/\s*a|a\s*\/\s*c)\b/i,
  /\b(?:custodian|custody|nominees?|omnibus|clients?)\b/i,
];

export function isCustodianName(name) {
  return custodianPatterns.some((pattern) => pattern.test(name.normalize("NFKC")));
}

const ownerAliases = new Map([
  // GSMF listed name; ASDM provider misspelling.
  ["equity developoment investment", "equity development investment"],
  // BPII listed name; BPTR and MTWI use International.
  ["batavia prosperindo international", "batavia prosperindo internasional"],
  // IMAS listed name; IMJS uses International.
  ["indomobil sukses international", "indomobil sukses internasional"],
  // PANR listed name; PDES omits the space after PT.
  ["ptpanorama sentrawisata", "panorama sentrawisata"],
  // POLL listed name; POLI uses Properti.
  ["pollux properti indonesia", "pollux properties indonesia"],
  // ADRO uses Soeryadjaja; MPMX, SRTG and TBIG use Soeryadjaya.
  ["edwin soeryadjaja", "edwin soeryadjaya"],
]);
const aliasTargets = new Set(ownerAliases.values());

function normalizedOwnerKey(name) {
  const words = name.normalize("NFKC").toLowerCase().replace(/^\s*p\.?t\.(?=\p{L})/u, "pt ").replace(/\./g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/);
  while (words[0] === "pt") words.shift();
  while (["pt", "tbk", "persero", "ltd", "limited"].includes(words.at(-1))) words.pop();
  return words.join(" ");
}

export function ownerKey(name) {
  const key = normalizedOwnerKey(name);
  return ownerAliases.get(key) ?? key;
}

export const BUCKET_LABELS = Object.freeze(["Afiliasi", "Afiliasi Pengendali"]);
const buckets = new Set(BUCKET_LABELS.map(ownerKey));

function reportedSum(values) {
  const reported = values.filter((value) => value !== null);
  return reported.length ? reported.reduce((sum, value) => sum + value, 0) : null;
}

export function buildOwners(snapshot) {
  const listed = new Map();
  for (const company of snapshot.companies) {
    const key = ownerKey(company.name);
    if (!listed.has(key)) listed.set(key, []);
    listed.get(key).push(company);
  }
  const entities = snapshot.holdings.filter(({ holderKind }) => holderKind === "entity");
  const byCompany = new Map();
  for (const row of entities) {
    if (!byCompany.has(row.symbol)) byCompany.set(row.symbol, []);
    byCompany.get(row.symbol).push(row);
  }
  const owners = new Map();
  for (const row of entities) {
    const key = ownerKey(row.holderName);
    if (!key) throw new Error(`${row.symbol}: empty owner key`);
    if (!owners.has(key)) owners.set(key, { spellings: new Map(), holdings: [] });
    const owner = owners.get(key);
    owner.spellings.set(row.holderName, (owner.spellings.get(row.holderName) ?? 0) + 1);
    const rank = row.percentage === null ? null : 1 + byCompany.get(row.symbol).filter((other) => other.percentage !== null && other.percentage > row.percentage).length;
    const { symbol, holderName: reportedName, percentage, shares, value, sourceId } = row;
    owner.holdings.push({ symbol, reportedName, percentage, shares, value, rank, isLargest: rank === 1, sourceId });
  }
  return [...owners].sort(([a], [b]) => compare(a, b)).map(([key, owner]) => {
    const spellings = [...owner.spellings].sort(([a, n], [b, m]) => m - n || compare(a, b));
    const listedCompany = listed.get(key)?.length === 1 ? listed.get(key)[0] : null;
    const name = aliasTargets.has(key)
      ? (listedCompany && normalizedOwnerKey(listedCompany.name) === key ? listedCompany.name : spellings.find(([spelling]) => normalizedOwnerKey(spelling) === key)?.[0] ?? key)
      : spellings[0][0];
    const listedSymbol = listedCompany?.symbol ?? null;
    const holdings = owner.holdings.sort((a, b) => compare(a.symbol, b.symbol) || compare(JSON.stringify(a), JSON.stringify(b)));
    return {
      key, name, kind: buckets.has(key) ? "bucket" : listedSymbol ? "company" : "holder", listedSymbol,
      holdings, companyCount: new Set(holdings.map(({ symbol }) => symbol)).size,
      totalValue: reportedSum(holdings.map(({ value }) => value)),
    };
  });
}

export function buildGroups(snapshot) {
  const groups = new Map();
  for (const company of [...snapshot.companies].sort((a, b) => compare(a.symbol, b.symbol))) {
    for (const label of new Set(company.affiliates ?? [])) {
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(company);
    }
  }
  const slugs = new Set();
  return [...groups].map(([label, members]) => {
    const slug = label.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
    if (!slug || slugs.has(slug)) throw new Error(`Duplicate or empty group slug: ${label}`);
    slugs.add(slug);
    return { slug, label, symbols: members.map(({ symbol }) => symbol), totalMarketCap: reportedSum(members.map(({ current }) => current.marketCap ?? null)) };
  }).sort((a, b) => compare(a.slug, b.slug));
}
