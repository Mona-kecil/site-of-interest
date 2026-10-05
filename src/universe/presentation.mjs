import { FIELD_DEFINITIONS } from "./fields.mjs";

const fields = new Map(FIELD_DEFINITIONS.map((field) => [field.providerField, field]));
const number = (value, digits = 2) => new Intl.NumberFormat("en", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const fieldDefinition = (field) => fields.get(field.split("[")[0]);
const lowerFirst = (label) => /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;
const plainPeriod = (period) => period.replace(/^FY/, "").replace(/^(Q\d)-/, "$1 ");

function humanField(field) {
  const match = /^(\w+)(?:\[(\d{4}|Q\d-\d{4})\])?$/.exec(field);
  const definition = match && fields.get(match[1]);
  if (!definition) return null;
  return `${definition.label}${match[2] ? ` ${plainPeriod(match[2])}` : ""}`;
}

export function inputLabel(input) {
  if (input.field === "major_shareholders_name.share_percentage") return input.key;
  const label = fieldDefinition(input.field)?.label ?? input.key;
  return input.period === "current" ? label : `${label}, ${plainPeriod(input.period)}`;
}

// A stored period such as "FY2023–FY2025" or "TTM Q3-2025..Q2-2026 / FY2020–FY2025".
export function humanPeriod(period) {
  const [first, second] = period.split(" / ");
  const years = (part) => part.replace(/FY(\d{4})/g, "$1");
  if (/^(current|TTM|MRQ)/.test(first)) return second?.startsWith("FY") ? `Today vs ${years(second)}` : "Today";
  return years(first);
}

const gapText = {
  "pe_ttm is zero or negative": "Earnings over the last four quarters are zero or a loss, so there is no P/E.",
  "pb_mrq is zero or negative": "Equity is zero or negative, so there is no P/B.",
  "Earnings sum is zero or negative": "Earnings over the three years add up to zero or a loss.",
  "Operating cash flow sum is zero or negative": "Operating cash flow over the three years adds up to zero or less.",
  "EBITDA is zero or negative": "EBITDA is zero or negative.",
  "Invested capital is zero or negative": "Invested capital is zero or negative.",
  "Fewer than 3 positive PE years reported": "Fewer than three years with a positive P/E to compare against.",
  "Fewer than 3 positive PB years reported": "Fewer than three years with a positive P/B to compare against.",
  "2020 or 2025 revenue is zero or negative": "Revenue in 2020 or 2025 is zero or negative.",
  "2020 outstanding shares is zero": "No shares outstanding in 2020.",
  "No entity holdings reported": "No named shareholders in the data.",
  "Calculation is not finite": "The figures don’t give a meaningful result.",
};

export function humanGap(gap) {
  if (gapText[gap]) return gapText[gap];
  const stake = /^Not reported: (.+) percentage$/.exec(gap);
  if (stake) return `No stake figure for ${stake[1]}.`;
  if (gap.startsWith("Not reported: ")) {
    const labels = gap.slice(14).split(", ").map(humanField);
    if (labels.every((label) => label !== null)) {
      const named = labels.map(lowerFirst);
      const last = named.at(-1);
      return `No data for ${named.length === 1 ? last : `${named.slice(0, -1).join(", ")} and ${last}`}.`;
    }
  }
  return gap;
}

export function gapCategory(gap) {
  if (/^Fewer than \d+ .*years reported$/.test(gap ?? "")) return "Too little history";
  if (/ is zero(?: or negative)?$/.test(gap ?? "") || gap === "Calculation is not finite") return "Not meaningful";
  return "No data";
}

export function formatValue(value, unit) {
  if (value === null) return "No data";
  if (unit === "percent") return `${number(value * 100)}%`;
  if (unit === "multiple") return `${number(value)}×`;
  return number(value, 0);
}

export function checkCell(result, unit) {
  if (!result) return { state: "does-not-apply", text: "Does not apply", reason: null };
  if (result.value === null) return { state: "gap", text: gapCategory(result.gap), reason: humanGap(result.gap ?? "No data") };
  return { state: "measured", text: formatValue(result.value, unit), reason: null };
}

export function formatInput(value, field = "", checkUnit = "multiple") {
  if (value === null) return "No data";
  const definition = fieldDefinition(field);
  if (definition?.key === "totalDividend") return `IDR ${number(value)} per share`;
  if (definition?.unit === "IDR") return `IDR ${number(value / 1e9)} bn`;
  if (definition?.unit === "fraction" || field === "major_shareholders_name.share_percentage") return formatValue(value, "percent");
  if (definition?.unit === "ratio") return formatValue(value, checkUnit);
  return new Intl.NumberFormat("en", { maximumFractionDigits: 12 }).format(value);
}

export function sourceLine(retrievedAt) {
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(retrievedAt));
  return `Sectors, retrieved ${date}`;
}
