import { useRef, useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";

const route = getRouteApi("/flow/$ticker");
type FlowRecord = NonNullable<FunctionReturnType<typeof api.flow.get>>;
type BrokerDay = FlowRecord["brokerDays"][number];
type MarketDay = FlowRecord["marketDays"][number];

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const jakartaDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : numberFormat.format(value);
}

function datesInWindow(window: { start: string; end: string }) {
  const dates: string[] = [];
  const cursor = new Date(`${window.end}T00:00:00Z`);
  while (cursor.toISOString().slice(0, 10) >= window.start && dates.length < 14) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates;
}

function brokerTotals(day: BrokerDay | undefined) {
  if (!day || day.brokers.length === 0) return undefined;
  return day.brokers.reduce(
    (total, broker) => ({
      buy: total.buy + broker.buy.value,
      sell: total.sell + broker.sell.value,
      net: total.net + broker.net.value,
    }),
    { buy: 0, sell: 0, net: 0 },
  );
}

function observationLabel(market: MarketDay | undefined, broker: BrokerDay | undefined) {
  if (broker && broker.brokers.length === 0) return "No broker rows";
  if (market && broker) return "Market + broker";
  if (market) return "Broker retention gap";
  if (broker) return "Market data gap";
  return "Exchange closure or retention gap";
}

export function FlowPage() {
  const { ticker } = route.useParams();
  const { empireSlug } = route.useSearch();
  return <FlowWorkspace key={`${empireSlug}:${ticker}`} empireSlug={empireSlug} ticker={ticker} />;
}

function FlowWorkspace({ empireSlug, ticker }: { empireSlug: string; ticker: string }) {
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const record = useQuery(api.flow.get, { empireSlug, ticker, asOf });
  const fetchLatest = useAction(api.flowFetch.fetchLatest);
  const [selectedDate, setSelectedDate] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const attempted = useRef(false);

  if (record === undefined) {
    return (
      <main className="route-state">
        <span className="loading-orbit" />
        <p>Loading stored flow records</p>
      </main>
    );
  }

  if (record === null) {
    return (
      <main className="route-state">
        <p className="eyebrow">[flow / unknown listed company]</p>
        <h1>
          No Flow record exists for {ticker.toUpperCase()} in {empireSlug}.
        </h1>
        <Link className="company-back-link" to="/empires">
          Browse Empires
        </Link>
      </main>
    );
  }

  if (record.window === null) {
    return (
      <main className="route-state">
        <p>Could not determine the latest 14-day broker window. Reload this page to try again.</p>
      </main>
    );
  }

  const disclosedWindowEnd = record.window.end;
  const brokerByDate = new Map(record.brokerDays.map((day) => [day.tradingDate, day]));
  const marketByDate = new Map(record.marketDays.map((day) => [day.tradingDate, day]));
  const currentDates = datesInWindow(record.window);
  const storedDates = [...new Set([...brokerByDate.keys(), ...marketByDate.keys()])]
    .filter((date) => !currentDates.includes(date))
    .sort((a, b) => b.localeCompare(a));
  const dates = [...currentDates, ...storedDates];
  const suggestedDate =
    currentDates.find((date) => brokerByDate.has(date) || marketByDate.has(date)) ??
    storedDates[0] ??
    currentDates[0];
  const activeDate = dates.includes(selectedDate) ? selectedDate : suggestedDate;
  const brokerDay = activeDate === undefined ? undefined : brokerByDate.get(activeDate);
  const marketDay = activeDate === undefined ? undefined : marketByDate.get(activeDate);
  const totals = brokerTotals(brokerDay);
  const brokers = brokerDay?.brokers
    .slice()
    .sort(
      (left, right) =>
        right.buy.value - left.buy.value || left.brokerCode.localeCompare(right.brokerCode),
    );
  const brokerGapCount = currentDates.filter(
    (date) => !brokerTotals(brokerByDate.get(date)),
  ).length;
  const marketGapCount = currentDates.filter((date) => !marketByDate.has(date)).length;
  const requestEndpoint = `/v2/broker-summary/${encodeURIComponent(record.ticker)}/?start=${record.window.start}&end=${record.window.end}`;

  async function loadLatest() {
    if (attempted.current) return;
    const now = new Date();
    if (jakartaDateFormat.format(now) !== disclosedWindowEnd) {
      setAsOf(now.toISOString());
      setRequestMessage("The Jakarta date changed. Review the new window before loading.");
      return;
    }
    attempted.current = true;
    setHasAttempted(true);
    setIsRequesting(true);
    setRequestMessage(null);
    try {
      const result = await fetchLatest({ empireSlug, ticker });
      switch (result.status) {
        case "fetched":
          setRequestMessage("Sectors returned a new window. Stored observations are ready below.");
          break;
        case "stored":
          setRequestMessage("This window was already stored. No new Sectors request was needed.");
          break;
        case "busy":
          setRequestMessage(
            "A request for this ticker is already running. Stored data will update when it finishes.",
          );
          break;
        case "unavailable":
          setRequestMessage("Sectors collection is not configured in this environment.");
          break;
        case "failed":
          setRequestMessage(
            "The request failed. Existing stored observations are still available.",
          );
          break;
        case "capped":
          setRequestMessage(
            "This window reached its request limit. Stored observations remain available.",
          );
          break;
        case "unknown":
          setRequestMessage("This ticker is not in the selected Empire's listed company records.");
          break;
        default: {
          const exhaustive: never = result.status;
          return exhaustive;
        }
      }
    } catch {
      setRequestMessage(
        "The request could not complete. Existing stored observations are still available.",
      );
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <main className="flow-page">
      <header className="flow-header">
        <div>
          <Link
            className="flow-back-link"
            to="/empire/$empireSlug/company/$ticker"
            params={{ empireSlug, ticker: record.ticker }}
          >
            ← {record.ticker} company intelligence
          </Link>
          <p className="eyebrow">[flow / observed market and broker records]</p>
          <h1>{record.ticker} Flow</h1>
          <p className="flow-company-name">{record.companyName}</p>
          <p className="flow-intro">
            Compare the stored daily close and volume with each broker's reported activity. Broker
            codes identify exchange members, not the investors behind their trades.
          </p>
        </div>
        <div className="flow-request">
          <p className="eyebrow">[on-demand collection / Sectors]</p>
          <p>
            Broker request: {record.window.start} to {record.window.end}, the latest 14 Jakarta
            calendar days. Existing market prices and volume are not refreshed by this action.
          </p>
          <code className="flow-request-endpoint">{requestEndpoint}</code>
          <button
            type="button"
            onClick={loadLatest}
            disabled={
              hasAttempted || record.fetch.status === "fetching" || record.fetch.status === "capped"
            }
          >
            {isRequesting || record.fetch.status === "fetching"
              ? "Loading latest window…"
              : record.fetch.status === "capped"
                ? "Window request limit reached"
                : hasAttempted
                  ? "Request attempted for this visit"
                  : "Load latest 14 days (up to 1 Sectors credit)"}
          </button>
          {requestMessage && (
            <p className="flow-feedback" role="status">
              {requestMessage}
            </p>
          )}
          {record.fetch.status === "failed" && record.fetch.error && (
            <p className="flow-error" role="alert">
              {record.fetch.error}
            </p>
          )}
        </div>
      </header>

      <div className="flow-window-line">
        <span>
          Current broker window / {record.window.start} to {record.window.end} /{" "}
          {record.fetch.status}
        </span>
        <span>
          {record.fetch.retrievedAt
            ? `Last retrieved ${record.fetch.retrievedAt}`
            : "No on-demand retrieval yet"}
        </span>
      </div>

      {record.brokerDays.length === 0 && record.marketDays.length === 0 ? (
        <section className="flow-empty">
          <p className="eyebrow">[coverage gap]</p>
          <h2>No market or broker observations are stored for {record.ticker}.</h2>
          <p>Use the explicit load action above to request the latest bounded window.</p>
        </section>
      ) : (
        <>
          <dl className="flow-metrics" aria-label={`Selected day ${activeDate} metrics`}>
            <div>
              <dt>Close / IDR</dt>
              <dd>{formatNumber(marketDay?.close)}</dd>
              <small>{activeDate}</small>
            </div>
            <div>
              <dt>Volume / shares</dt>
              <dd>{formatNumber(marketDay?.volume)}</dd>
              <small>{activeDate}</small>
            </div>
            <div>
              <dt>Broker buy / IDR</dt>
              <dd>{formatNumber(totals?.buy)}</dd>
              <small>{activeDate}</small>
            </div>
            <div>
              <dt>Broker sell / IDR</dt>
              <dd>{formatNumber(totals?.sell)}</dd>
              <small>{activeDate}</small>
            </div>
          </dl>

          <div className="flow-grid">
            <div className="flow-primary">
              <section className="flow-section">
                <div className="flow-section-heading">
                  <div>
                    <p className="eyebrow">[01 / daily observations]</p>
                    <h2>Select a date</h2>
                  </div>
                  <span>
                    {currentDates.length} current dates · {storedDates.length} earlier stored dates
                  </span>
                </div>
                <p className="flow-help">
                  Choose a date to inspect independent market and broker records. A missing row is a
                  gap, not zero activity.
                </p>
                <div className="flow-table-wrap">
                  <table className="flow-table flow-daily-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Close / IDR</th>
                        <th>Volume / shares</th>
                        <th>Broker buy / IDR</th>
                        <th>Broker sell / IDR</th>
                        <th>Broker net / IDR</th>
                        <th>Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dates.map((date) => {
                        const market = marketByDate.get(date);
                        const broker = brokerByDate.get(date);
                        const dayTotals = brokerTotals(broker);
                        return (
                          <tr
                            key={date}
                            className={date === activeDate ? "is-selected" : undefined}
                          >
                            <th scope="row">
                              <button
                                type="button"
                                aria-pressed={date === activeDate}
                                onClick={() => setSelectedDate(date)}
                              >
                                {date}
                                {storedDates.includes(date) ? " · stored history" : ""}
                              </button>
                            </th>
                            <td>{formatNumber(market?.close)}</td>
                            <td>{formatNumber(market?.volume)}</td>
                            <td>{formatNumber(dayTotals?.buy)}</td>
                            <td>{formatNumber(dayTotals?.sell)}</td>
                            <td
                              className={
                                dayTotals && dayTotals.net < 0 ? "flow-negative" : undefined
                              }
                            >
                              {formatNumber(dayTotals?.net)}
                            </td>
                            <td className={!market || !dayTotals ? "flow-gap" : undefined}>
                              {observationLabel(market, broker)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="flow-section">
                <div className="flow-section-heading">
                  <div>
                    <p className="eyebrow">[02 / independent exchange members]</p>
                    <h2>Broker activity · {activeDate}</h2>
                  </div>
                  <span>{brokers?.length ?? 0} reported brokers</span>
                </div>
                {brokers === undefined ? (
                  <p className="flow-gap-note">
                    No broker record is stored for {activeDate}. This may be an exchange closure or
                    a provider retention gap; it does not mean zero broker activity.
                  </p>
                ) : brokers.length === 0 ? (
                  <p className="flow-gap-note">
                    Sectors returned no broker rows for {activeDate}. This is a coverage gap, not
                    zero activity.
                  </p>
                ) : (
                  <div className="flow-table-wrap">
                    <table className="flow-table flow-broker-table">
                      <thead>
                        <tr>
                          <th>Broker code</th>
                          <th>Buy / IDR</th>
                          <th>Sell / IDR</th>
                          <th>Net / IDR</th>
                          <th>Buy / lots</th>
                          <th>Sell / lots</th>
                          <th>Net / lots</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brokers.map((broker) => (
                          <tr key={broker.brokerCode}>
                            <th scope="row">{broker.brokerCode}</th>
                            <td>{formatNumber(broker.buy.value)}</td>
                            <td>{formatNumber(broker.sell.value)}</td>
                            <td className={broker.net.value < 0 ? "flow-negative" : undefined}>
                              {formatNumber(broker.net.value)}
                            </td>
                            <td>{formatNumber(broker.buy.lots)}</td>
                            <td>{formatNumber(broker.sell.lots)}</td>
                            <td className={broker.net.lots < 0 ? "flow-negative" : undefined}>
                              {formatNumber(broker.net.lots)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="flow-help">
                  Sorted by reported buy value. Net is Sectors' reported buy value minus sell value
                  for each broker. No investor identity or intent is inferred.
                </p>
              </section>
            </div>

            <aside className="flow-aside">
              <section className="flow-section">
                <p className="eyebrow">[03 / coverage]</p>
                <h2>What is stored</h2>
                <dl className="flow-coverage">
                  <div>
                    <dt>Broker days</dt>
                    <dd>{record.brokerDays.length}</dd>
                  </div>
                  <div>
                    <dt>Market days</dt>
                    <dd>{record.marketDays.length}</dd>
                  </div>
                  <div>
                    <dt>Current dates without broker rows</dt>
                    <dd>{brokerGapCount}</dd>
                  </div>
                  <div>
                    <dt>Current dates without market rows</dt>
                    <dd>{marketGapCount}</dd>
                  </div>
                </dl>
                <p className="flow-help">
                  The selected window spans calendar days. Dates with no stored observation can be
                  exchange closures or provider retention gaps. No historical backfill runs here.
                </p>
              </section>
              <section className="flow-section">
                <p className="eyebrow">[04 / evidence for {activeDate}]</p>
                <h2>Source records</h2>
                <div className="flow-source">
                  <h3>Market</h3>
                  {marketDay ? (
                    <>
                      <p>Authenticated Sectors API</p>
                      <code>{marketDay.source.endpoint}</code>
                      <small>Retrieved {marketDay.source.retrievedAt}</small>
                    </>
                  ) : (
                    <p className="flow-gap">No stored market source for this date.</p>
                  )}
                </div>
                <div className="flow-source">
                  <h3>Broker</h3>
                  {brokerDay ? (
                    <>
                      <p>Authenticated Sectors API</p>
                      <code>{brokerDay.source.endpoint}</code>
                      <small>Retrieved {brokerDay.source.retrievedAt}</small>
                    </>
                  ) : (
                    <p className="flow-gap">No stored broker source for this date.</p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
