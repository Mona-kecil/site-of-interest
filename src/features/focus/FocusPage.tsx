import { useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cycleLabels, formatCompanyValue, type CycleState } from "../company/company-model";
import {
  focusCycle,
  focusGaps,
  orderFocusRows,
  peerPremium,
  priorityReason,
  type FocusRow,
  type FocusSort,
} from "./focus-model";

const route = getRouteApi("/focus/$empireSlug");
const sorts: ReadonlyArray<{ value: FocusSort; label: string; explanation: string }> = [
  {
    value: "priority",
    label: "Research priority",
    explanation:
      "Most unresolved board gaps first; then the largest difference between reported quarterly revenue and earnings growth; then ticker. This order is for investigation, not a return forecast.",
  },
  { value: "ticker", label: "Ticker A–Z", explanation: "Ticker, alphabetically." },
  {
    value: "pe",
    label: "P/E high to low",
    explanation: "Latest provider-reported P/E, high to low; missing values last.",
  },
  {
    value: "revenue",
    label: "Revenue growth high to low",
    explanation: "Reported quarterly revenue growth, high to low; missing values last.",
  },
  {
    value: "earnings",
    label: "Earnings growth high to low",
    explanation: "Reported quarterly earnings growth, high to low; missing values last.",
  },
  {
    value: "cash_flow",
    label: "Free cash flow high to low",
    explanation: "Latest annual free cash flow, high to low; missing values last.",
  },
];

function selectedSort(value: string): FocusSort {
  return sorts.find((sort) => sort.value === value)?.value ?? "priority";
}

function selectedCycle(value: string): CycleState | "all" {
  switch (value) {
    case "both_growing":
    case "revenue_growing":
    case "earnings_growing":
    case "neither_growing":
    case "incomplete":
      return value;
    default:
      return "all";
  }
}

function MetricValue({ metric }: { metric: FocusRow["pe"] }) {
  if (metric === null) return <span className="focus-missing">—</span>;
  return (
    <span className={metric.value < 0 ? "focus-negative" : undefined}>
      {formatCompanyValue(metric.value, metric.unit)}
    </span>
  );
}

function Evidence({
  row,
  sources,
}: {
  row: FocusRow;
  sources: Map<string, { title: string; retrievedAt: string; reference: string }>;
}) {
  const metrics = [
    ["P/E", row.pe],
    ["Peer P/E", row.peerPe],
    ["Quarterly revenue growth", row.revenueGrowth],
    ["Quarterly earnings growth", row.earningsGrowth],
    ["Free cash flow", row.freeCashFlow],
  ] as const;
  return (
    <div className="focus-evidence">
      <p>
        Peer premium = (company P/E ÷ provider peer P/E − 1) × 100, formula v1. Both inputs must be
        positive. The provider has not defined the peer set.
      </p>
      <p>
        Cycle state compares the signs of the two reported quarterly growth values. Zero counts as
        not growing. The provider field does not identify the reporting quarter.
      </p>
      {focusGaps(row).length > 0 && (
        <p className="focus-gap-copy">
          Check the next Sectors company report for: {focusGaps(row).join("; ")}.
        </p>
      )}
      <dl>
        {metrics.map(([label, metric]) =>
          metric === null ? null : (
            <div key={label}>
              <dt>
                {label} · {metric.period}
              </dt>
              <dd>
                Fact {metric.factId} · as of {metric.asOf} · {metric.context}
                {metric.sourceRefs.map((ref) => {
                  const source = sources.get(ref.sourceId);
                  return (
                    <span key={`${ref.sourceId}:${ref.locator}`}>
                      {" · "}
                      {source?.title ?? ref.sourceId} ·{" "}
                      {source?.retrievedAt ?? "retrieval date not stored"} ·{" "}
                      {source?.reference ?? "source path not stored"} · {ref.locator}
                    </span>
                  );
                })}
              </dd>
            </div>
          ),
        )}
      </dl>
    </div>
  );
}

export function FocusPage() {
  const { empireSlug } = route.useParams();
  const board = useQuery(api.focus.getBoard, { empireSlug });
  const [sort, setSort] = useState<FocusSort>("priority");
  const [cycle, setCycle] = useState<CycleState | "all">("all");
  const [incompleteOnly, setIncompleteOnly] = useState(false);

  if (board === undefined)
    return (
      <main className="route-state">
        <span className="loading-orbit" />
        <p>Loading Focus</p>
      </main>
    );
  if (board === null)
    return (
      <main className="route-state">
        <p className="eyebrow">Unknown Empire</p>
        <h1>No Focus board exists for “{empireSlug}”.</h1>
        <Link to="/empires">See Empires</Link>
      </main>
    );

  const rows = orderFocusRows(board.rows, { sort, cycle, incompleteOnly });
  const sourceMap = new Map(board.sources.map((source) => [source.id, source]));
  const incompleteCount = board.rows.filter((row) => focusGaps(row).length > 0).length;
  const currentSort = sorts.find((item) => item.value === sort) ?? sorts[0];

  return (
    <main className="focus-page">
      <header className="focus-header">
        <div>
          <p className="eyebrow">[Focus / {empireSlug} / stored corpus]</p>
          <h1>Where to look next</h1>
          <p>
            Compare listed companies in {board.empireName}. The board uses stored Sectors facts as
            of {board.asOf}.
          </p>
        </div>
        <Link
          to="/empire/$slug"
          params={{ slug: empireSlug }}
          search={{ ticker: undefined, originKind: undefined, originId: undefined }}
        >
          Open Empire →
        </Link>
      </header>

      <dl className="focus-summary">
        <div>
          <dt>Listed companies</dt>
          <dd>{board.rows.length}</dd>
        </div>
        <div>
          <dt>With board gaps</dt>
          <dd>{incompleteCount}</dd>
        </div>
        <div>
          <dt>Showing</dt>
          <dd>{rows.length}</dd>
        </div>
      </dl>

      <section className="focus-workspace" aria-label="Focus research queue">
        <header className="focus-workspace-header">
          <div>
            <p className="eyebrow">[01 / comparison queue]</p>
            <h2>Company board</h2>
          </div>
          <span>Facts, calculations and gaps</span>
        </header>
        <div className="focus-controls">
          <label>
            Sort
            <select value={sort} onChange={(event) => setSort(selectedSort(event.target.value))}>
              {sorts.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cycle state
            <select value={cycle} onChange={(event) => setCycle(selectedCycle(event.target.value))}>
              <option value="all">All states</option>
              {Object.entries(cycleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="focus-check">
            <input
              type="checkbox"
              checked={incompleteOnly}
              onChange={(event) => setIncompleteOnly(event.target.checked)}
            />{" "}
            Incomplete board coverage
          </label>
        </div>
        <p className="focus-sort-explanation">
          <strong>{currentSort.label}.</strong> {currentSort.explanation}
          {sort === "priority" && rows.length > 0
            ? ` First: ${rows[0].ticker}, ${priorityReason(rows[0])}.`
            : ""}
        </p>
        {rows.length === 0 ? (
          <p className="focus-empty">
            No listed companies match these filters. Change the cycle or coverage filter.
          </p>
        ) : (
          <div className="focus-table-wrap">
            <table className="focus-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Cycle state</th>
                  <th>P/E</th>
                  <th>Peer P/E</th>
                  <th>Peer premium</th>
                  <th>Revenue growth</th>
                  <th>Earnings growth</th>
                  <th>Free cash flow</th>
                  <th>Coverage / evidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const premium = peerPremium(row);
                  const gaps = focusGaps(row);
                  return (
                    <tr key={row.ticker}>
                      <th scope="row">
                        <Link
                          to="/empire/$empireSlug/company/$ticker"
                          params={{ empireSlug, ticker: row.ticker }}
                        >
                          <strong>{row.ticker}</strong>
                          <span>{row.companyName}</span>
                          <small>
                            {gaps.length === 0
                              ? "Core metrics present"
                              : `${gaps.length} ${gaps.length === 1 ? "gap" : "gaps"}`}
                          </small>
                        </Link>
                      </th>
                      <td>{cycleLabels[focusCycle(row)]}</td>
                      <td>
                        <MetricValue metric={row.pe} />
                      </td>
                      <td>
                        <MetricValue metric={row.peerPe} />
                      </td>
                      <td>
                        {premium === null ? (
                          <span className="focus-missing">Gap</span>
                        ) : (
                          <span className={premium < 0 ? "focus-negative" : undefined}>
                            {formatCompanyValue(premium, "percent")}
                          </span>
                        )}
                      </td>
                      <td>
                        <MetricValue metric={row.revenueGrowth} />
                      </td>
                      <td>
                        <MetricValue metric={row.earningsGrowth} />
                      </td>
                      <td>
                        <MetricValue metric={row.freeCashFlow} />
                      </td>
                      <td>
                        <details>
                          <summary>
                            {gaps.length === 0
                              ? "Complete · evidence"
                              : `${gaps.length} ${gaps.length === 1 ? "gap" : "gaps"} · evidence`}
                          </summary>
                          <Evidence row={row} sources={sourceMap} />
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="focus-footnote">
          Quarterly growth is provider reported; its exact reporting quarter is not identified. P/E
          values use the latest stored annual valuation period. Free cash flow uses the latest
          stored annual financial record. Open a company or expand evidence to inspect the
          underlying fact.
        </p>
      </section>
    </main>
  );
}
