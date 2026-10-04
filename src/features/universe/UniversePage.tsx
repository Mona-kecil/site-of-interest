import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { definitions, type CheckDefinition } from "../../universe/checks.mjs";
import {
  filterOptions,
  formatInput,
  formatMarketCap,
  formatPeers,
  formatValue,
  lenses,
  screenRows,
  summaryFor,
  type Filters,
  type Sort,
} from "./universe-model";

type Selection = { symbol: string; checkId: string };
const columns = [
  { id: "symbol", label: "Symbol" },
  { id: "name", label: "Name" },
  { id: "subSector", label: "Sub-sector" },
  { id: "marketCap", label: "Market cap" },
];
const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));

function CheckPanel({ selection, close }: { selection: Selection; close: () => void }) {
  const result = useQuery(api.universe.check, selection);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <aside
      id="universe-check-details"
      className="universe-panel"
      aria-label="Check details"
      tabIndex={-1}
      ref={panel}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <header>
        <p className="eyebrow">{selection.symbol} / measurement</p>
        <button type="button" onClick={close} aria-label="Close check details">
          Close
        </button>
      </header>
      <a
        className="universe-company-link"
        href={`/company/${encodeURIComponent(selection.symbol)}`}
      >
        Open company
      </a>
      {result === undefined ? (
        <p role="status">Loading check inputs</p>
      ) : result === null ? (
        <p>No stored result for this check.</p>
      ) : (
        <>
          <h2>{result.definition.label}</h2>
          <p>{result.definition.question}</p>
          <dl className="universe-calculation">
            <div>
              <dt>Formula</dt>
              <dd>{result.definition.formula}</dd>
            </div>
            <div>
              <dt>Period</dt>
              <dd>{result.period}</dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd>{formatValue(result.value, result.definition.unit)}</dd>
            </div>
            <div>
              <dt>Sub-sector percentile</dt>
              <dd>
                {result.subSector ?? "Not reported"}:{" "}
                {formatPeers(result.percentile, result.peerCount)}
              </dd>
            </div>
            {result.gap && (
              <div>
                <dt>Gap</dt>
                <dd>{result.gap}</dd>
              </div>
            )}
          </dl>
          <p className="universe-note">
            Percentiles rank the reported values within the sub-sector. They carry no direction.
            Fewer than 5 reported peers leaves the percentile unreported.
          </p>
          <h3>Inputs and sources</h3>
          <ol className="universe-inputs">
            {result.inputs.map((input, index) => (
              <li key={`${input.field}:${input.key}:${index}`}>
                <strong>{input.key}</strong>
                {input.label && <p>{input.label}</p>}
                <dl>
                  <div>
                    <dt>Field</dt>
                    <dd>
                      <code>{input.field}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Period</dt>
                    <dd>{input.period}</dd>
                  </div>
                  <div>
                    <dt>Value</dt>
                    <dd>{formatInput(input.value)}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{input.source?.title ?? `Source unavailable: ${input.sourceId}`}</dd>
                  </div>
                  {input.source && (
                    <>
                      <div>
                        <dt>Endpoint</dt>
                        <dd>
                          <code>{input.source.endpoint}</code>
                        </dd>
                      </div>
                      <div>
                        <dt>Retrieved</dt>
                        <dd>
                          <time dateTime={input.source.retrievedAt}>
                            {input.source.retrievedAt}
                          </time>
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </li>
            ))}
          </ol>
        </>
      )}
    </aside>
  );
}

export function UniversePage() {
  const companies = useQuery(api.universe.screen, {});
  const [lensIndex, setLensIndex] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    sector: "",
    subSector: "",
    index: "",
  });
  const [sort, setSort] = useState<Sort>({ column: "symbol", direction: "asc" });
  const [selection, setSelection] = useState<Selection | null>(null);
  const lens = lenses[lensIndex];
  const checks = lens.checks.map((id) => definitionById.get(id) as CheckDefinition);
  const rows = screenRows(companies ?? [], filters, sort);
  const changeFilter = (key: keyof Filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const changeSort = (column: string) =>
    setSort((current) => ({
      column,
      direction: current.column === column && current.direction === "asc" ? "desc" : "asc",
    }));

  return (
    <main className="universe-page">
      <header className="universe-header">
        <p className="eyebrow">[IDX / fundamentals]</p>
        <h1>Universe</h1>
        <p>
          Cash, capital, obligations, price and ownership. Each measurement opens its formula and
          source inputs.
        </p>
      </header>
      <div className="universe-lenses" role="tablist" aria-label="Check lenses">
        {lenses.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={item.label}
            id={`universe-tab-${index}`}
            aria-selected={index === lensIndex}
            aria-controls="universe-table-panel"
            tabIndex={index === lensIndex ? 0 : -1}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % lenses.length
                  : event.key === "ArrowLeft"
                    ? (index + lenses.length - 1) % lenses.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? lenses.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                setLensIndex(next);
                setSort({ column: "symbol", direction: "asc" });
                document.getElementById(`universe-tab-${next}`)?.focus();
              }
            }}
            onClick={() => {
              setLensIndex(index);
              setSort({ column: "symbol", direction: "asc" });
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="universe-controls">
        <label>
          Search companies
          <input
            type="search"
            placeholder="Symbol or name"
            value={filters.search}
            onChange={(event) => changeFilter("search", event.target.value)}
          />
        </label>
        {(
          [
            ["sector", "Sector", "sector"],
            ["subSector", "Sub-sector", "subSector"],
            ["index", "Index", "indices"],
          ] as const
        ).map(([key, label, field]) => (
          <label key={key}>
            {label}
            <select
              value={filters[key]}
              onChange={(event) => changeFilter(key, event.target.value)}
            >
              <option value="">
                {key === "index" ? "All indices" : `All ${label.toLowerCase()}s`}
              </option>
              {filterOptions(companies ?? [], field).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="universe-note" role="status">
        {companies === undefined
          ? "Loading companies"
          : `${rows.length} of ${companies.length} companies`}{" "}
        · Percentiles compare reported sub-sector values.
      </p>
      <section
        id="universe-table-panel"
        role="tabpanel"
        aria-labelledby={`universe-tab-${lensIndex}`}
      >
        <div
          className="universe-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Company measurements table"
        >
          <table className="universe-table">
            <caption>{lens.label} measurements</caption>
            <thead>
              <tr>
                {[...columns, ...checks].map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      sort.column === column.id
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button type="button" onClick={() => changeSort(column.id)}>
                      {column.label}
                      {sort.column === column.id ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.symbol} data-symbol={row.symbol}>
                  <th scope="row">
                    <a
                      className="universe-company-link"
                      href={`/company/${encodeURIComponent(row.symbol)}`}
                    >
                      {row.symbol}
                    </a>
                  </th>
                  <td className="universe-company-name">
                    <a
                      className="universe-company-link"
                      href={`/company/${encodeURIComponent(row.symbol)}`}
                    >
                      {row.name}
                    </a>
                  </td>
                  <td>{row.subSector ?? "n/a"}</td>
                  <td>{formatMarketCap(row.marketCap)}</td>
                  {checks.map((definition) => {
                    const summary = summaryFor(row, definition.id);
                    const gap =
                      summary?.gap ??
                      (!summary ? "This check does not apply to this sub-sector" : null);
                    const gapId = `gap-${row.symbol}-${definition.id}`;
                    return (
                      <td key={definition.id}>
                        <div className="universe-cell-wrap">
                          <button
                            type="button"
                            className="universe-cell"
                            aria-label={`${row.symbol} ${definition.label}`}
                            aria-describedby={gap ? gapId : undefined}
                            aria-controls={summary ? "universe-check-details" : undefined}
                            aria-expanded={
                              summary
                                ? selection?.symbol === row.symbol &&
                                  selection.checkId === definition.id
                                : undefined
                            }
                            aria-disabled={!summary}
                            title={gap ?? undefined}
                            onClick={() => {
                              if (summary)
                                setSelection({ symbol: row.symbol, checkId: definition.id });
                            }}
                          >
                            <span>{formatValue(summary?.value ?? null, definition.unit)}</span>
                            {summary && (
                              <small>{formatPeers(summary.percentile, summary.peerCount)}</small>
                            )}
                          </button>
                          {gap && (
                            <span role="tooltip" id={gapId} className="universe-gap">
                              {gap}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {companies !== undefined && rows.length === 0 && <p>No companies match these filters.</p>}
      </section>
      {selection && (
        <CheckPanel
          key={`${selection.symbol}:${selection.checkId}`}
          selection={selection}
          close={() => setSelection(null)}
        />
      )}
    </main>
  );
}
