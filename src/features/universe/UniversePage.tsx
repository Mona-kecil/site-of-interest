import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { definitions, type CheckDefinition } from "../../universe/checks.mjs";
import {
  filterOptions,
  formatMarketCap,
  lenses,
  screenRows,
  summaryFor,
  type Filters,
  type Sort,
} from "./universe-model";

import { checkCell, humanPeriod } from "../../universe/presentation.mjs";
import { CheckCalculation } from "./CheckCalculation";
import { verdictLabels } from "../ideas/ideas-model";

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
  const cell = result ? checkCell(result, result.definition.unit) : null;
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
        <Link
          className="universe-company-link"
          to="/company/$ticker"
          params={{ ticker: selection.symbol }}
        >
          {selection.symbol} company page →
        </Link>
        <button type="button" onClick={close} aria-label="Close check details">
          Close
        </button>
      </header>
      {result === undefined ? (
        <p role="status">Loading…</p>
      ) : result === null ? (
        <p>No figure for this company.</p>
      ) : (
        <>
          <h2>{result.definition.label}</h2>
          <p>{result.definition.question}</p>
          <p className="universe-panel-value">
            <strong>{cell?.text}</strong>
            <small>{humanPeriod(result.period)}</small>
          </p>
          {cell?.reason && <p className="profile-note">{cell.reason}</p>}
          <h3>How it’s calculated</h3>
          <CheckCalculation definition={result.definition} inputs={result.inputs} />
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
    verdict: "",
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
    <main className="page universe-page wrap">
      <header className="page-head">
        <h1>Screener</h1>
        <div className="page-intro">
          <p>
            Every IDX company on every measurement. Pick a lens, filter, and open any number to see
            how it’s calculated. No data means our data provider doesn’t have a figure the
            measurement needs.
          </p>
        </div>
      </header>
      <div
        className="universe-lenses"
        role="tablist"
        aria-label="Check lenses"
        data-tour="screener"
      >
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
        <label>
          Verdict
          <select
            value={filters.verdict}
            onChange={(event) => changeFilter("verdict", event.target.value)}
          >
            <option value="">All verdicts</option>
            {Object.entries(verdictLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="universe-note" role="status">
        {companies === undefined
          ? "Loading companies"
          : `${rows.length} of ${companies.length} companies`}
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
                    <Link
                      className="universe-company-link"
                      to="/company/$ticker"
                      params={{ ticker: row.symbol }}
                    >
                      {row.symbol}
                    </Link>
                    <small className="universe-row-name">{row.name}</small>
                  </th>
                  <td className="universe-company-name">
                    <Link
                      className="universe-company-link"
                      to="/company/$ticker"
                      params={{ ticker: row.symbol }}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td>{row.subSector ?? "No data"}</td>
                  <td>{formatMarketCap(row.marketCap)}</td>
                  {checks.map((definition) => {
                    const summary = summaryFor(row, definition.id);
                    const cell = checkCell(summary, definition.unit);
                    const gap = cell.reason;
                    const gapId = `gap-${row.symbol}-${definition.id}`;
                    return (
                      <td key={definition.id}>
                        <div className="universe-cell-wrap">
                          {summary ? (
                            <button
                              type="button"
                              className="universe-cell"
                              aria-label={`${row.symbol} ${definition.label}`}
                              aria-describedby={gap ? gapId : undefined}
                              aria-controls="universe-check-details"
                              aria-expanded={
                                selection?.symbol === row.symbol &&
                                selection.checkId === definition.id
                              }
                              title={gap ?? undefined}
                              onClick={() =>
                                setSelection({ symbol: row.symbol, checkId: definition.id })
                              }
                            >
                              <span>{cell.text}</span>
                            </button>
                          ) : (
                            <span className="universe-cell check-does-not-apply">{cell.text}</span>
                          )}
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
