import { useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

type Signal = Doc<"fundamentalSignals">;
type NewsRecord = Doc<"newsRecords">;
type FeedItem = { kind: "fundamental"; signal: Signal } | { kind: "news"; signal: NewsRecord };
type Lens = "all" | "fundamental" | "news";
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
        </div>
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
        An exact ticker match links the article to a company; it does not verify the article’s
        claims.
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
  const focusedNews = useQuery(
    api.news.detail,
    focus?.kind === "news" ? { empireSlug: focus.empireSlug, stableId: focus.id } : "skip",
  );
  const feed = usePaginatedQuery(
    api.fundamentalSignals.list,
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
  const newsItems = newsFeed.results.filter(
    (item) =>
      (empire === "all" || item.empireSlug === empire) && metric === "all" && period === "all",
  );
  const items: FeedItem[] = [
    ...(kind === "all" || kind === "fundamental"
      ? fundamentalItems.map((signal): FeedItem => ({ kind: "fundamental", signal }))
      : []),
    ...(kind === "all" || kind === "news"
      ? newsItems.map((signal): FeedItem => ({ kind: "news", signal }))
      : []),
  ];
  const focusedItem: FeedItem | undefined =
    focus?.kind === "fundamental" && focusedFundamental
      ? { kind: "fundamental", signal: focusedFundamental.signal }
      : focus?.kind === "news" && focusedNews
        ? { kind: "news", signal: focusedNews }
        : undefined;
  const focusedDate = focusedItem
    ? focusedItem.kind === "fundamental"
      ? focusedItem.signal.asOf
      : focusedItem.signal.publishedAt.slice(0, 10)
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
    const aDate = a.kind === "fundamental" ? a.signal.asOf : a.signal.publishedAt;
    const bDate = b.kind === "fundamental" ? b.signal.asOf : b.signal.publishedAt;
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
          <p className="eyebrow">Company research / source-backed records</p>
          <h1>What’s happening?</h1>
          <p className="today-intro">
            Fundamental measurements and matched news from Sectors. Dates are provider fact or
            publication dates. Each record includes its sources and coverage gaps.
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
          {(["all", "fundamental", "news"] as const).map((option) => (
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
          {!comparable && (feed.status !== "Exhausted" || newsFeed.status !== "Exhausted")
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
                dateTime={item.kind === "fundamental" ? item.signal.asOf : item.signal.publishedAt}
              >
                {item.kind === "fundamental"
                  ? item.signal.asOf
                  : item.signal.publishedAt.slice(0, 10)}
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
                  {item.kind === "news" ? "published article" : item.signal.period}
                </span>
                <strong>
                  {item.kind === "news" ? item.signal.sourceName : formatValue(item.signal)}
                </strong>
                <small>
                  {item.kind === "news"
                    ? "Exact provider ticker match"
                    : (item.signal.gap ?? item.signal.sector)}
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
                  : "No records match this range and filter."}
            </p>
          )}
          {!comparable && feed.status === "CanLoadMore" && (
            <button type="button" className="today-load-more" onClick={() => feed.loadMore(50)}>
              Show more records
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
