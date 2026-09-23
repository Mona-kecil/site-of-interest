import { useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { BrokerFlow } from "../company/BrokerFlow";
import { MarketContext } from "../company/MarketContext";

type Signal = Doc<"fundamentalSignals">;
type BrokerSignal = Doc<"brokerSignals">;
type MarketSignal = Doc<"marketSignals">;
type NewsRecord = Doc<"newsRecords">;
type FeedItem =
  | { kind: "fundamental"; signal: Signal }
  | { kind: "broker"; signal: BrokerSignal }
  | { kind: "market"; signal: MarketSignal }
  | { kind: "news"; signal: NewsRecord };
type Lens = "all" | "fundamental" | "market" | "broker" | "news";
type Sort = "newest" | "lowest" | "highest";
const route = getRouteApi("/happening");

function jakartaDate(offset = 0) {
  const date = new Date(Date.now() + offset * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatValue(signal: Signal) {
  if (signal.value === null) return "Data gap";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(signal.value)}${signal.unit === "%" ? "%" : ` ${signal.unit}`}`;
}

function SignalDetail({ signal }: { signal: Signal }) {
  const [lens, setLens] = useState<"all" | "fundamental" | "market" | "broker">("all");
  const [expandedId, setExpandedId] = useState(signal.stableId);
  const detail = useQuery(api.fundamentalSignals.detail, {
    empireSlug: signal.empireSlug,
    stableId: expandedId,
  });
  const companySignals = useQuery(api.fundamentalSignals.byCompany, {
    empireSlug: signal.empireSlug,
    ticker: signal.ticker,
  });
  const record = detail?.signal ?? signal;

  return (
    <div className="today-detail">
      <div className="today-detail-heading">
        <div>
          <p className="eyebrow">Recorded measurement</p>
          <h2>{record.ticker}</h2>
          <p>
            {record.companyName} · {record.empireSlug}
          </p>
        </div>
        <span className="today-kind kind-fundamental">fundamental</span>
      </div>
      <section className="today-detail-primary">
        <span>
          {record.metricLabel} · {record.period}
        </span>
        <strong>{formatValue(record)}</strong>
        <p>{record.gap ?? `As of ${record.asOf} · ${record.sector} · ${record.unit}`}</p>
      </section>
      <section className="today-detail-section">
        <h3>Calculation · {record.ruleVersion}</h3>
        <code>{record.formula}</code>
      </section>
      <section className="today-detail-section">
        <h3>Inputs</h3>
        {record.inputs.length === 0 ? (
          <p className="today-empty">No provider value was returned for this period.</p>
        ) : (
          <dl>
            {record.inputs.map((input) => (
              <div key={`${input.factId}:${input.label}`}>
                <dt>{input.label}</dt>
                <dd>
                  {new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(input.value)}{" "}
                  {input.unit}
                </dd>
                <small>Fact {input.factId}</small>
              </div>
            ))}
          </dl>
        )}
      </section>
      <section className="today-detail-section">
        <h3>Sources</h3>
        <ul>
          {record.inputs.flatMap((input) =>
            input.sourceRefs.map((ref) => (
              <li key={`${input.label}:${ref.sourceId}:${ref.locator}`}>
                <strong>
                  {detail?.sources.find((source) => source.stableId === ref.sourceId)?.title ??
                    ref.sourceId}
                </strong>
                <span>{ref.locator}</span>
              </li>
            )),
          )}
        </ul>
      </section>
      <section className="today-company-lenses">
        <div className="today-lens-heading">
          <div>
            <h3>Company records</h3>
            <p>Source-backed measurements for {record.ticker}</p>
          </div>
          <div className="today-lens-tabs" aria-label="Company measurement lens">
            {(["all", "fundamental", "market", "broker"] as const).map((option) => (
              <button
                type="button"
                key={option}
                className={lens === option ? "is-active" : ""}
                onClick={() => setLens(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        {(lens === "all" || lens === "fundamental") && (
          <div className="today-lens-sections">
            <section>
              <h4>All fundamental measurements</h4>
              {companySignals === undefined ? (
                <p className="today-empty">Loading company measurements…</p>
              ) : (
                <dl>
                  {companySignals
                    .slice()
                    .sort(
                      (a, b) =>
                        b.period.localeCompare(a.period) ||
                        a.metricLabel.localeCompare(b.metricLabel),
                    )
                    .map((item) => (
                      <button
                        type="button"
                        className="today-company-measurement"
                        key={item.stableId}
                        onClick={() => setExpandedId(item.stableId)}
                      >
                        <span>
                          {item.metricLabel} · {item.period}
                        </span>
                        <strong>{formatValue(item)}</strong>
                      </button>
                    ))}
                </dl>
              )}
            </section>
            <p className="today-detail-footnote">
              <Link
                to="/empire/$empireSlug/company/$ticker"
                params={{ empireSlug: record.empireSlug, ticker: record.ticker }}
              >
                Open full company record →
              </Link>
            </p>
          </div>
        )}
        {(lens === "all" || lens === "broker") && (
          <BrokerFlow empireSlug={record.empireSlug} ticker={record.ticker} />
        )}
        {(lens === "all" || lens === "market") && (
          <MarketContext empireSlug={record.empireSlug} ticker={record.ticker} />
        )}
      </section>
      <p className="today-detail-footnote">
        Values and gaps as recorded. No interpretation or recommendation.
      </p>
      <p className="today-detail-footnote">
        <Link
          to="/empire/$slug"
          params={{ slug: record.empireSlug }}
          search={{ ticker: record.ticker, originKind: "fundamental", originId: record.stableId }}
        >
          Open Empire context →
        </Link>
      </p>
    </div>
  );
}

function BrokerSignalDetail({ signal }: { signal: BrokerSignal }) {
  const detail = useQuery(api.brokerSignals.detail, {
    empireSlug: signal.empireSlug,
    stableId: signal.stableId,
  });
  const record = detail?.signal ?? signal;
  const rows = detail?.day.brokers.slice().sort((a, b) => b.buy.value - a.buy.value);
  return (
    <div className="today-detail">
      <div className="today-detail-heading">
        <div>
          <p className="eyebrow">Recorded broker measurement</p>
          <h2>{record.ticker}</h2>
          <p>
            {record.companyName} · {record.empireSlug}
          </p>
        </div>
        <span className="today-kind kind-broker">broker</span>
      </div>
      <section className="today-detail-primary">
        <span>
          {record.metricLabel} · {record.tradingDate}
        </span>
        <strong>{record.value.toFixed(2)}%</strong>
        <p>
          Broker {record.brokerCode} · {record.observedBrokers} observed brokers
        </p>
      </section>
      <section className="today-detail-section">
        <h3>Calculation · {record.ruleVersion}</h3>
        <code>{record.formula}</code>
        <dl>
          <div>
            <dt>{record.brokerCode} buy value</dt>
            <dd>{record.buyValue.toLocaleString("en-US")} IDR</dd>
          </div>
          <div>
            <dt>All observed broker buy value</dt>
            <dd>{record.totalBuyValue.toLocaleString("en-US")} IDR</dd>
          </div>
          <div>
            <dt>{record.brokerCode} sell value</dt>
            <dd>{record.sellValue.toLocaleString("en-US")} IDR</dd>
          </div>
          <div>
            <dt>{record.brokerCode} net value</dt>
            <dd>{record.netValue.toLocaleString("en-US")} IDR</dd>
          </div>
        </dl>
      </section>
      <section className="today-detail-section">
        <h3>All broker rows on {record.tradingDate}</h3>
        {rows === undefined ? (
          <p>Loading source rows…</p>
        ) : (
          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Buy value</th>
                  <th>Sell value</th>
                  <th>Net value</th>
                  <th>Buy lots</th>
                  <th>Sell lots</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.brokerCode}>
                    <th>{row.brokerCode}</th>
                    <td>{row.buy.value.toLocaleString("en-US")}</td>
                    <td>{row.sell.value.toLocaleString("en-US")}</td>
                    <td>{row.net.value.toLocaleString("en-US")}</td>
                    <td>{row.buy.lots.toLocaleString("en-US")}</td>
                    <td>{row.sell.lots.toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="today-detail-section">
        <h3>Source</h3>
        <p>
          Sectors · {record.source.endpoint} · retrieved {record.source.retrievedAt}
        </p>
      </section>
      <p className="today-detail-footnote">
        <Link
          to="/empire/$empireSlug/company/$ticker"
          params={{ empireSlug: record.empireSlug, ticker: record.ticker }}
        >
          Open full company record →
        </Link>
      </p>
      <p className="today-detail-footnote">
        A broker code identifies an exchange member, not the beneficial investor. No interpretation
        or recommendation.
      </p>
      <p className="today-detail-footnote">
        <Link
          to="/empire/$slug"
          params={{ slug: record.empireSlug }}
          search={{ ticker: record.ticker, originKind: "broker", originId: record.stableId }}
        >
          Open Empire context →
        </Link>
      </p>
    </div>
  );
}

function MarketSignalDetail({ signal }: { signal: MarketSignal }) {
  const detail = useQuery(api.marketSignals.detail, {
    empireSlug: signal.empireSlug,
    stableId: signal.stableId,
  });
  const record = detail?.signal ?? signal;
  return (
    <div className="today-detail">
      <div className="today-detail-heading">
        <div>
          <p className="eyebrow">Recorded market measurement</p>
          <h2>{record.ticker}</h2>
          <p>
            {record.companyName} · {record.empireSlug}
          </p>
        </div>
        <span className="today-kind kind-market">market</span>
      </div>
      <section className="today-detail-primary">
        <span>
          {record.metricLabel} · {record.tradingDate}
        </span>
        <strong>{record.value === null ? "Data gap" : `${record.value.toFixed(2)}x`}</strong>
        <p>
          {record.gap ?? "Observation-day volume divided by the previous 20 stored trading days"}
        </p>
      </section>
      <section className="today-detail-section">
        <h3>Calculation · {record.ruleVersion}</h3>
        <code>{record.formula}</code>
        <dl>
          <div>
            <dt>Observation-day volume</dt>
            <dd>{record.volume.toLocaleString("en-US")} shares</dd>
          </div>
          <div>
            <dt>Prior 20-day average</dt>
            <dd>{record.baselineAverage?.toLocaleString("en-US") ?? "—"} shares</dd>
          </div>
          <div>
            <dt>Baseline coverage</dt>
            <dd>{record.baselineDays.length} of 20 prior stored trading days</dd>
          </div>
        </dl>
      </section>
      <section className="today-detail-section">
        <h3>Baseline inputs</h3>
        <div className="financial-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Volume</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {record.baselineDays.map((day) => (
                <tr key={day.tradingDate}>
                  <th>{day.tradingDate}</th>
                  <td>{day.volume.toLocaleString("en-US")}</td>
                  <td>{day.source.endpoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="today-detail-section">
        <h3>Observation source</h3>
        <p>
          Sectors · {record.source.endpoint} · retrieved {record.source.retrievedAt}
        </p>
        {detail && (
          <p>
            Close: {detail.day.close.toLocaleString("en-US")} IDR · volume:{" "}
            {detail.day.volume.toLocaleString("en-US")} shares
          </p>
        )}
      </section>
      <p className="today-detail-footnote">
        <Link
          to="/empire/$empireSlug/company/$ticker"
          params={{ empireSlug: record.empireSlug, ticker: record.ticker }}
        >
          Open full company record →
        </Link>
      </p>
      <p className="today-detail-footnote">
        Measured values only. No interpretation or recommendation.
      </p>
      <p className="today-detail-footnote">
        <Link
          to="/empire/$slug"
          params={{ slug: record.empireSlug }}
          search={{ ticker: record.ticker, originKind: "market", originId: record.stableId }}
        >
          Open Empire context →
        </Link>
      </p>
    </div>
  );
}

function NewsDetail({ record }: { record: NewsRecord }) {
  const coverage = useQuery(api.news.coverage, { empireSlug: record.empireSlug });
  return (
    <div className="today-detail">
      <div className="today-detail-heading">
        <div>
          <p className="eyebrow">Provider news record</p>
          <h2>Company news</h2>
          <p>
            {record.empireSlug} · published {record.publishedAt}
          </p>
        </div>
        <span className="today-kind kind-news">news</span>
      </div>
      <section className="today-detail-primary">
        <span>{record.sourceName}</span>
        <strong>{record.title}</strong>
      </section>
      <section className="today-detail-section">
        <h3>Entity matches</h3>
        <p>Rule: exact ticker in the Sectors `symbols` field. No name or topic inference.</p>
        <ul>
          {record.matchedTickers.map((ticker) => (
            <li key={ticker}>
              <Link
                to="/empire/$empireSlug/company/$ticker"
                params={{ empireSlug: record.empireSlug, ticker }}
              >
                {ticker} company record →
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="today-detail-section">
        <h3>Source and coverage</h3>
        <p>
          <a href={record.articleUrl} target="_blank" rel="noreferrer">
            Open source article
          </a>
        </p>
        <p>
          Sectors · {record.sourceEndpoint} · retrieved {record.retrievedAt}
        </p>
        {coverage && (
          <p>
            Imported {coverage.importedCount} of {coverage.totalCount} returned articles from{" "}
            {coverage.start} to {coverage.end}
            {coverage.truncated ? "; pagination incomplete" : ""}.
          </p>
        )}
        <p>
          The provider has no separate event time or article ID for this record. The app key comes
          from its URL, title, and publication time.
        </p>
      </section>
      <p className="today-detail-footnote">
        A news item and a market move appearing near each other do not establish causation.
      </p>
      <p className="today-detail-footnote">
        <Link
          to="/empire/$slug"
          params={{ slug: record.empireSlug }}
          search={{
            ticker: record.matchedTickers[0],
            originKind: "news",
            originId: record.stableId,
          }}
        >
          Open Empire context →
        </Link>
      </p>
    </div>
  );
}

export function TodayPage() {
  const { focusKind, focusId, focusEmpire } = route.useSearch();
  const focus =
    focusKind && focusId && focusEmpire
      ? { kind: focusKind, id: focusId, empireSlug: focusEmpire }
      : undefined;
  const catalog = useQuery(api.fundamentalSignals.catalog);
  const today = jakartaDate();
  const yesterday = jakartaDate(-1);
  const [range, setRange] = useState({ start: "2000-01-01", end: today });
  const [kind, setKind] = useState<Lens>(focus?.kind ?? "all");
  const [empire, setEmpire] = useState("all");
  const [metric, setMetric] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [selectedId, setSelectedId] = useState(focus?.id ?? "");
  const focusedFundamental = useQuery(
    api.fundamentalSignals.detail,
    focus?.kind === "fundamental" ? { empireSlug: focus.empireSlug, stableId: focus.id } : "skip",
  );
  const focusedBroker = useQuery(
    api.brokerSignals.detail,
    focus?.kind === "broker" ? { empireSlug: focus.empireSlug, stableId: focus.id } : "skip",
  );
  const focusedMarket = useQuery(
    api.marketSignals.detail,
    focus?.kind === "market" ? { empireSlug: focus.empireSlug, stableId: focus.id } : "skip",
  );
  const focusedNews = useQuery(
    api.news.detail,
    focus?.kind === "news" ? { empireSlug: focus.empireSlug, stableId: focus.id } : "skip",
  );
  const feed = usePaginatedQuery(
    api.fundamentalSignals.list,
    range.start <= range.end ? { start: range.start, end: range.end } : "skip",
    { initialNumItems: 50 },
  );
  const brokerFeed = usePaginatedQuery(
    api.brokerSignals.list,
    range.start <= range.end ? { start: range.start, end: range.end } : "skip",
    { initialNumItems: 50 },
  );
  const marketFeed = usePaginatedQuery(
    api.marketSignals.list,
    range.start <= range.end ? { start: range.start, end: range.end } : "skip",
    { initialNumItems: 50 },
  );
  const newsFeed = usePaginatedQuery(
    api.news.list,
    range.start <= range.end ? { start: range.start, end: range.end } : "skip",
    { initialNumItems: 50 },
  );
  const selectedMetric = catalog?.metrics.find((item) => item.id === metric);
  const comparable = selectedMetric !== undefined && period !== "all";
  const comparison = useQuery(
    api.fundamentalSignals.compare,
    comparable
      ? {
          metricId: metric,
          period,
          unit: selectedMetric.unit,
          start: range.start,
          end: range.end,
          empireSlug: empire === "all" ? null : empire,
        }
      : "skip",
  );
  const fundamentalItems = (comparable ? (comparison ?? []) : feed.results).filter(
    (item) =>
      (empire === "all" || item.empireSlug === empire) &&
      (metric === "all" || item.metricId === metric) &&
      (period === "all" || item.period === period),
  );
  const brokerItems = brokerFeed.results.filter(
    (item) =>
      (empire === "all" || item.empireSlug === empire) && metric === "all" && period === "all",
  );
  const marketItems = marketFeed.results.filter(
    (item) =>
      (empire === "all" || item.empireSlug === empire) && metric === "all" && period === "all",
  );
  const newsItems = newsFeed.results.filter(
    (item) =>
      (empire === "all" || item.empireSlug === empire) && metric === "all" && period === "all",
  );
  const items: FeedItem[] = [
    ...(kind === "all" || kind === "fundamental"
      ? fundamentalItems.map((signal): FeedItem => ({ kind: "fundamental", signal }))
      : []),
    ...(kind === "all" || kind === "broker"
      ? brokerItems.map((signal): FeedItem => ({ kind: "broker", signal }))
      : []),
    ...(kind === "all" || kind === "market"
      ? marketItems.map((signal): FeedItem => ({ kind: "market", signal }))
      : []),
    ...(kind === "all" || kind === "news"
      ? newsItems.map((signal): FeedItem => ({ kind: "news", signal }))
      : []),
  ];
  const focusedItem: FeedItem | undefined =
    focus?.kind === "fundamental" && focusedFundamental
      ? { kind: "fundamental", signal: focusedFundamental.signal }
      : focus?.kind === "broker" && focusedBroker
        ? { kind: "broker", signal: focusedBroker.signal }
        : focus?.kind === "market" && focusedMarket
          ? { kind: "market", signal: focusedMarket.signal }
          : focus?.kind === "news" && focusedNews
            ? { kind: "news", signal: focusedNews }
            : undefined;
  const focusedDate = focusedItem
    ? focusedItem.kind === "fundamental"
      ? focusedItem.signal.asOf
      : focusedItem.kind === "news"
        ? focusedItem.signal.publishedAt.slice(0, 10)
        : focusedItem.signal.tradingDate
    : undefined;
  if (
    focusedItem &&
    kind === focus?.kind &&
    focusedDate !== undefined &&
    focusedDate >= range.start &&
    focusedDate <= range.end &&
    (empire === "all" || focusedItem.signal.empireSlug === empire) &&
    (focusedItem.kind !== "fundamental" ||
      ((metric === "all" || focusedItem.signal.metricId === metric) &&
        (period === "all" || focusedItem.signal.period === period))) &&
    (focusedItem.kind === "fundamental" || (metric === "all" && period === "all")) &&
    !items.some((item) => item.signal.stableId === focusedItem.signal.stableId)
  ) {
    items.push(focusedItem);
  }
  items.sort((a, b) => {
    if (comparable && sort !== "newest" && a.kind === "fundamental" && b.kind === "fundamental") {
      if (a.signal.value === null) return 1;
      if (b.signal.value === null) return -1;
      return sort === "lowest" ? a.signal.value - b.signal.value : b.signal.value - a.signal.value;
    }
    const aDate =
      a.kind === "fundamental"
        ? a.signal.asOf
        : a.kind === "news"
          ? a.signal.publishedAt
          : a.signal.tradingDate;
    const bDate =
      b.kind === "fundamental"
        ? b.signal.asOf
        : b.kind === "news"
          ? b.signal.publishedAt
          : b.signal.tradingDate;
    return bDate.localeCompare(aDate) || a.signal.stableId.localeCompare(b.signal.stableId);
  });
  const selected = items.find((item) => item.signal.stableId === selectedId) ?? items[0];
  const preset =
    range.start === today && range.end === today
      ? "today"
      : range.start === yesterday && range.end === yesterday
        ? "yesterday"
        : range.start === "2000-01-01" && range.end === today
          ? "all"
          : "custom";

  return (
    <main className="today-page">
      <header className="today-header">
        <div>
          <p className="eyebrow">Market intelligence / source-backed records</p>
          <h1>What’s happening?</h1>
          <p className="today-intro">
            Fundamental measurements, market and broker activity, and matched news from Sectors.
            Dates are provider fact, trading, or publication dates. Interpret the records yourself.
          </p>
        </div>
      </header>
      <section className="today-controls" aria-label="Filter records">
        <div className="today-date-control">
          <span>Time frame</span>
          <div>
            <button
              type="button"
              className={preset === "all" ? "is-active" : ""}
              onClick={() => setRange({ start: "2000-01-01", end: today })}
            >
              All records
            </button>
            <button
              type="button"
              className={preset === "today" ? "is-active" : ""}
              onClick={() => setRange({ start: today, end: today })}
            >
              Today
            </button>
            <button
              type="button"
              className={preset === "yesterday" ? "is-active" : ""}
              onClick={() => setRange({ start: yesterday, end: yesterday })}
            >
              Yesterday
            </button>
          </div>
        </div>
        <div className="today-custom-range">
          <label>
            <span>From</span>
            <input
              type="date"
              max={range.end}
              value={range.start}
              onChange={(event) => setRange({ ...range, start: event.target.value })}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              min={range.start}
              value={range.end}
              onChange={(event) => setRange({ ...range, end: event.target.value })}
            />
          </label>
        </div>
        <div className="today-kind-filters">
          {(["all", "fundamental", "market", "broker", "news"] as const).map((option) => (
            <button
              type="button"
              key={option}
              className={kind === option ? "is-active" : ""}
              onClick={() => setKind(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <label>
          <span>Empire</span>
          <select value={empire} onChange={(event) => setEmpire(event.target.value)}>
            <option value="all">All empires</option>
            {catalog?.empires.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Metric</span>
          <select
            value={metric}
            onChange={(event) => {
              setMetric(event.target.value);
              setSort("newest");
            }}
          >
            <option value="all">All metrics</option>
            {catalog?.metrics.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Period</span>
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setSort("newest");
            }}
          >
            <option value="all">All periods</option>
            {catalog?.periods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target.value === "lowest"
                  ? "lowest"
                  : event.target.value === "highest"
                    ? "highest"
                    : "newest",
              )
            }
          >
            <option value="newest">Newest date</option>
            <option value="lowest" disabled={!comparable}>
              Lowest value
            </option>
            <option value="highest" disabled={!comparable}>
              Highest value
            </option>
          </select>
        </label>
        <span className="today-result-count">
          {items.length} shown
          {!comparable &&
          (feed.status !== "Exhausted" ||
            brokerFeed.status !== "Exhausted" ||
            marketFeed.status !== "Exhausted" ||
            newsFeed.status !== "Exhausted")
            ? " · more available"
            : ""}
        </span>
      </section>
      <div className="today-inspector">
        <div className="today-inspector-list">
          <div className="today-list-label">
            <span>
              {range.start} to {range.end}
            </span>
            <small>
              {comparable
                ? `${selectedMetric.label} · ${period} · ${selectedMetric.unit}`
                : "Newest fact date first"}
            </small>
          </div>
          {items.map((item) => (
            <button
              type="button"
              key={item.signal.stableId}
              className={
                selected?.signal.stableId === item.signal.stableId
                  ? "today-inspector-row is-selected"
                  : "today-inspector-row"
              }
              onClick={() => setSelectedId(item.signal.stableId)}
            >
              <time
                dateTime={
                  item.kind === "fundamental"
                    ? item.signal.asOf
                    : item.kind === "news"
                      ? item.signal.publishedAt
                      : item.signal.tradingDate
                }
              >
                {item.kind === "fundamental"
                  ? item.signal.asOf
                  : item.kind === "news"
                    ? item.signal.publishedAt.slice(0, 10)
                    : item.signal.tradingDate}
              </time>
              <div className="today-item-identity">
                <span className={`today-kind kind-${item.kind}`}>{item.kind}</span>
                <span className="today-ticker">
                  {item.kind === "news"
                    ? item.signal.matchedTickers.join(", ")
                    : item.signal.ticker}
                </span>
                <span className="today-company">
                  {item.kind === "news" ? item.signal.sourceName : item.signal.companyName}
                </span>
                <span className="today-empire">{item.signal.empireSlug}</span>
              </div>
              <div className="today-measurement">
                <span>
                  {item.kind === "news" ? item.signal.title : item.signal.metricLabel} ·{" "}
                  {item.kind === "news"
                    ? "published article"
                    : item.kind === "fundamental"
                      ? item.signal.period
                      : item.kind === "broker"
                        ? item.signal.brokerCode
                        : "20-day baseline"}
                </span>
                <strong>
                  {item.kind === "news"
                    ? item.signal.sourceName
                    : item.kind === "fundamental"
                      ? formatValue(item.signal)
                      : item.kind === "broker"
                        ? `${item.signal.value.toFixed(2)}%`
                        : item.signal.value === null
                          ? "Data gap"
                          : `${item.signal.value.toFixed(2)}x`}
                </strong>
                <small>
                  {item.kind === "news"
                    ? "Exact provider ticker match"
                    : item.kind === "fundamental"
                      ? (item.signal.gap ?? item.signal.sector)
                      : item.kind === "broker"
                        ? `${item.signal.observedBrokers} brokers observed`
                        : (item.signal.gap ?? "20 prior stored trading days")}
                </small>
              </div>
            </button>
          ))}
          {items.length === 0 && (
            <p className="today-empty">
              {feed.status === "LoadingFirstPage" ||
              (kind === "news" && newsFeed.status === "LoadingFirstPage")
                ? "Loading records…"
                : kind === "news"
                  ? "No imported news matches this range. This does not mean there was no news."
                  : kind === "broker"
                    ? "No stored broker records match this range. An empty range is a coverage gap, not zero activity."
                    : kind === "market"
                      ? "No stored market records match this range. An empty range is a coverage gap, not zero activity."
                      : "No records match this range and filter."}
            </p>
          )}
          {!comparable && feed.status === "CanLoadMore" && (
            <button type="button" className="today-load-more" onClick={() => feed.loadMore(50)}>
              Show more records
            </button>
          )}
          {kind !== "fundamental" && brokerFeed.status === "CanLoadMore" && (
            <button
              type="button"
              className="today-load-more"
              onClick={() => brokerFeed.loadMore(50)}
            >
              Show more broker records
            </button>
          )}
          {kind !== "fundamental" && marketFeed.status === "CanLoadMore" && (
            <button
              type="button"
              className="today-load-more"
              onClick={() => marketFeed.loadMore(50)}
            >
              Show more market records
            </button>
          )}
          {kind !== "fundamental" && newsFeed.status === "CanLoadMore" && (
            <button type="button" className="today-load-more" onClick={() => newsFeed.loadMore(50)}>
              Show more news records
            </button>
          )}
        </div>
        <aside className="today-inspector-detail">
          {selected ? (
            selected.kind === "fundamental" ? (
              <SignalDetail key={selected.signal.stableId} signal={selected.signal} />
            ) : selected.kind === "broker" ? (
              <BrokerSignalDetail key={selected.signal.stableId} signal={selected.signal} />
            ) : selected.kind === "market" ? (
              <MarketSignalDetail key={selected.signal.stableId} signal={selected.signal} />
            ) : (
              <NewsDetail key={selected.signal.stableId} record={selected.signal} />
            )
          ) : (
            <p className="today-empty">Select a measurement to inspect its inputs and source.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
