import { FIELD_DEFINITIONS } from "./fields.mjs";

const fields = new Map(FIELD_DEFINITIONS.map((field) => [field.providerField, field]));
const number = (value, digits = 2) => new Intl.NumberFormat("en", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const fieldDefinition = (field) => fields.get(field.split("[")[0]);

export function checkQuestion(definition) {
  return definition.id === "fcf_yield" ? "What is free cash flow relative to the current market cap?" : definition.question;
}

function humanField(field) {
  const match = /^(\w+)(?:\[(\d{4}|Q\d-\d{4})\])?$/.exec(field);
  const definition = match && fields.get(match[1]);
  if (!definition) return null;
  return `${definition.label}${match[2] ? ` ${/^\d{4}$/.test(match[2]) ? "FY" : ""}${match[2]}` : ""}`;
}

export function inputLabel(input) {
  if (input.field === "major_shareholders_name.share_percentage") return `${input.key} · current stake`;
  const definition = fieldDefinition(input.field);
  const period = /^\d{4}$/.test(input.period) ? `FY${input.period}` : input.period;
  return `${definition?.label ?? input.key} · ${period}`;
}

export function humanGap(gap) {
  if (gap.startsWith("Not reported: ")) {
    const labels = gap.slice(14).split(", ").map((field, index) => {
      const label = humanField(field);
      return index && label && /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;
    });
    if (labels.every((label) => label !== null)) {
      const last = labels.at(-1);
      return `${labels.length === 1 ? last : `${labels.slice(0, -1).join(", ")} and ${last}`} not reported`;
    }
    return gap;
  }
  const base = /^(\w+) is (zero(?: or negative)?)$/.exec(gap);
  if (base && fields.has(base[1])) return `${fields.get(base[1]).label} is ${base[2]}`;
  const history = /^Fewer than 3 positive (PE|PB) years reported$/.exec(gap);
  if (history) return `Fewer than 3 positive ${history[1] === "PE" ? "P/E" : "P/B"} years reported`;
  if (gap === "2020 or 2025 revenue is zero or negative") return "FY2020 or FY2025 revenue is zero or negative";
  if (gap === "2020 outstanding shares is zero") return "FY2020 outstanding shares is zero";
  return gap;
}

export function gapCategory(gap) {
  if (/^Fewer than \d+ .*years reported$/.test(gap ?? "")) return "Too little history";
  if (/ is zero(?: or negative)?$/.test(gap ?? "") || gap === "Calculation is not finite") return "Not meaningful";
  return "Not reported";
}

export function formatValue(value, unit) {
  if (value === null) return "Not reported";
  if (unit === "percent") return `${number(value * 100)}%`;
  if (unit === "multiple") return `${number(value)}×`;
  return number(value, 0);
}

export function formatPeers(percentile, peerCount) {
  return percentile === null ? `${peerCount} peers · no percentile` : `p${Math.round(percentile * 100)} · ${peerCount} peers`;
}

export function checkCell(result, unit) {
  if (!result) return { state: "does-not-apply", text: "Does not apply", peers: null, reason: null };
  if (result.value === null) return { state: "gap", text: gapCategory(result.gap), peers: null, reason: humanGap(result.gap ?? "Inputs not reported") };
  return {
    state: result.percentile === null ? "few-peers" : "measured",
    text: formatValue(result.value, unit),
    peers: formatPeers(result.percentile, result.peerCount),
    reason: null,
  };
}

export function formatInput(value, field = "", checkUnit = "multiple") {
  if (value === null) return "Not reported";
  const definition = fieldDefinition(field);
  if (definition?.unit === "IDR") return `IDR ${number(value / 1e9)} bn`;
  if (definition?.unit === "fraction" || field === "major_shareholders_name.share_percentage") return formatValue(value, "percent");
  if (definition?.unit === "ratio") return formatValue(value, checkUnit);
  return new Intl.NumberFormat("en", { maximumFractionDigits: 12 }).format(value);
}

export function sourceLine(source, manifest) {
  const url = new URL(source.endpoint, "https://api.sectors.app");
  const batchId = source.id.replace(/-\d+$/, "");
  const batch = manifest.groups.findIndex(({ id }) => id === batchId);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 200);
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(source.retrievedAt));
  const provider = (source.provider ?? manifest.provider) === "sectors" ? "Sectors" : source.provider ?? manifest.provider;
  return `${provider} · ${url.pathname} · ${batch < 0 ? "batch not recorded" : `batch ${batch + 1} of ${manifest.groups.length}`} · rows ${offset + 1}–${Math.min(offset + limit, manifest.companyCount)} · ${date}`;
}
