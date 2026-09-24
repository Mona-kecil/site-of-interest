export const FLOW_COVERAGE_START = "2026-08-01";

export type BrokerWindow = { start: string; end: string };

export function latestCompletedBrokerWindow(instant: Date): BrokerWindow | null {
  if (Number.isNaN(instant.valueOf())) throw new Error("Invalid asOf timestamp");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const windowMonth = new Date(Date.UTC(year, month - (day < 15 ? 2 : 1), 1));
  const prefix = windowMonth.toISOString().slice(0, 7);
  const window =
    day >= 15 && day <= 28
      ? { start: `${prefix}-01`, end: `${prefix}-14` }
      : { start: `${prefix}-15`, end: `${prefix}-28` };
  return window.start < FLOW_COVERAGE_START ? null : window;
}
