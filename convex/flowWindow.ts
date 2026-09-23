export function latestJakartaWindow(instant: Date) {
  if (Number.isNaN(instant.valueOf())) throw new Error("Invalid asOf timestamp");
  const end = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  const startDate = new Date(`${end}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 13);
  return { start: startDate.toISOString().slice(0, 10), end };
}
