import {
  loadBrokerHistory,
  normalizeTicker,
  parseBrokerDays,
  writeFlowObservation,
} from "./market-flow.mjs";

function jakartaDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function createOnDemandBrokerFlow({ directory, sectors, now = () => new Date() }) {
  if (!directory) throw new Error("directory is required");
  if (!sectors || typeof sectors.requestWithUsage !== "function") throw new Error("sectors client is required");
  const inFlight = new Map();

  function load(value) {
    const ticker = normalizeTicker(value);
    const currentTime = now();
    const end = jakartaDate(currentTime);
    const start = shiftDate(end, -13);
    const key = `${ticker}:${start}:${end}`;
    if (inFlight.has(key)) return inFlight.get(key);

    const operation = (async () => {
      const parameters = new URLSearchParams({ start, end });
      const endpoint = `/v2/broker-summary/${ticker}/?${parameters}`;
      const { body: raw, usage } = await sectors.requestWithUsage(endpoint, 1);
      const days = parseBrokerDays(raw, { ticker, endpoint, retrievedAt: currentTime.toISOString() });
      const counts = { created: 0, unchanged: 0 };
      for (const day of days) counts[await writeFlowObservation(directory, day)] += 1;
      return {
        ticker,
        window: { start, end },
        days: await loadBrokerHistory(directory, ticker),
        fetch: { ...counts, ...usage },
      };
    })();
    inFlight.set(key, operation);
    operation.then(() => inFlight.delete(key), () => inFlight.delete(key));
    return operation;
  }

  return Object.freeze({ load });
}
