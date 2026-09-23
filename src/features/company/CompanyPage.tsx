import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  cycleLabels,
  deriveAnnualComparisons,
  deriveCycleState,
  formatCompanyValue,
} from "./company-model";
import { BrokerFlow } from "./BrokerFlow";
import { MarketContext } from "./MarketContext";
import { CompanyNews } from "./CompanyNews";

const route = getRouteApi("/company/$ticker");
const empireCompanyRoute = getRouteApi("/empire/$empireSlug/company/$ticker");

export function CompanyPage() {
  const { ticker } = route.useParams();
  return <CompanyRecord ticker={ticker} empireSlug="prajogo" />;
}

export function EmpireCompanyPage() {
  const { ticker, empireSlug } = empireCompanyRoute.useParams();
  return <CompanyRecord ticker={ticker} empireSlug={empireSlug} />;
}

function CompanyRecord({ ticker, empireSlug }: { ticker: string; empireSlug: string }) {
  const intelligence = useQuery(api.companies.getIntelligence, {
    empireSlug,
    ticker,
  });

  if (intelligence === undefined) {
    return (
      <main className="route-state">
        <span className="loading-orbit" />
        <p>Loading company intelligence</p>
      </main>
    );
  }

  if (intelligence === null) {
    return (
      <main className="route-state">
        <p className="eyebrow">Unknown listed company</p>
        <h1>No intelligence exists for “{ticker.toUpperCase()}”.</h1>
        <Link
          className="company-back-link"
          to="/empire/$slug"
          params={{ slug: empireSlug }}
          search={{ ticker: undefined, originKind: undefined, originId: undefined }}
        >
          Return to Empire
        </Link>
      </main>
    );
  }

  const { company, coverage, facts, relationships, sources } = intelligence;
  const latestFinancial = facts.financials.at(-1);
  const latestValuation = facts.valuations.at(-1);
  const previousValuation = facts.valuations.at(-2);
  const comparisons = deriveAnnualComparisons(facts.financials);
  const measurements = [...facts.measurements].sort((left, right) =>
    right.asOf.localeCompare(left.asOf),
  );
  const revenueGrowth = measurements.find((fact) => fact.metric === "yoy_quarter_revenue_growth");
  const earningsGrowth = measurements.find((fact) => fact.metric === "yoy_quarter_earnings_growth");
  const cycleState = deriveCycleState(revenueGrowth?.value ?? null, earningsGrowth?.value ?? null);

  return (
    <main className="company-page">
      <header className="company-hero">
        <div className="company-hero-copy">
          <Link
            className="company-back-link"
            to="/empire/$slug"
            params={{ slug: empireSlug }}
            search={{ ticker: company.ticker, originKind: undefined, originId: undefined }}
          >
            ← {empireSlug} Empire
          </Link>
          <p className="eyebrow">
            [company / {company.exchange} / {company.country}]
          </p>
          <div className="company-title-row">
            <h1>{company.ticker}</h1>
            <span>data: sectors</span>
          </div>
          <h2>{company.name}</h2>
          <p className="company-summary">{company.summary}</p>
        </div>
        <aside className="cycle-lens">
          <p className="eyebrow">[growth state / reported values]</p>
          <h2>{cycleLabels[cycleState]}</h2>
          <small>
            Sign of provider-reported quarterly revenue and earnings growth. Zero counts as not
            growing. The reporting quarter is not identified.
          </small>
          <p className="eyebrow">[valuation / reported values]</p>
          <h3>P/E record</h3>
          <dl>
            <div>
              <dt>{latestValuation?.year ?? "Latest"} P/E</dt>
              <dd>{latestValuation?.pe == null ? "—" : `${latestValuation.pe.toFixed(2)}×`}</dd>
            </div>
            <div>
              <dt>{previousValuation?.year ?? "Prior"} P/E</dt>
              <dd>{previousValuation?.pe == null ? "—" : `${previousValuation.pe.toFixed(2)}×`}</dd>
            </div>
            <div>
              <dt>{latestValuation?.year ?? "Latest"} provider peer P/E</dt>
              <dd>
                {latestValuation?.peerPe == null ? "—" : `${latestValuation.peerPe.toFixed(2)}×`}
              </dd>
            </div>
            <div>
              <dt>{latestFinancial?.year ?? "Latest"} earnings</dt>
              <dd>
                {latestFinancial === undefined
                  ? "—"
                  : formatCompanyValue(latestFinancial.earnings, latestFinancial.unit)}
              </dd>
            </div>
          </dl>
          <small>Source: Sectors company report. Missing values are shown as —.</small>
        </aside>
      </header>

      <dl className="company-metric-strip" aria-label="Key company metrics">
        {facts.metrics.slice(0, 8).map((metric) => (
          <div key={metric.id}>
            <dt>{metric.label}</dt>
            <dd>{formatCompanyValue(metric.value, metric.unit)}</dd>
            <small>{metric.asOf}</small>
          </div>
        ))}
      </dl>

      <div className="company-grid">
        <BrokerFlow empireSlug={empireSlug} ticker={company.ticker} />
        <MarketContext empireSlug={empireSlug} ticker={company.ticker} />
        <CompanyNews empireSlug={empireSlug} ticker={company.ticker} />
        <section className="company-card financial-history">
          <header>
            <div>
              <p className="eyebrow">[01 / annual records]</p>
              <h2>Financial history</h2>
            </div>
            <span>{facts.financials.length} years</span>
          </header>
          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Revenue</th>
                  <th>Earnings</th>
                  <th>Operating cash flow</th>
                  <th>Free cash flow</th>
                  <th>Total debt</th>
                </tr>
              </thead>
              <tbody>
                {facts.financials.map((year) => (
                  <tr key={year.id}>
                    <th>{year.year}</th>
                    <td>{formatCompanyValue(year.revenue, year.unit)}</td>
                    <td>{formatCompanyValue(year.earnings, year.unit)}</td>
                    <td>{formatCompanyValue(year.operatingCashFlow, year.unit)}</td>
                    <td>{formatCompanyValue(year.freeCashFlow, year.unit)}</td>
                    <td>
                      {year.totalDebt === undefined
                        ? "—"
                        : formatCompanyValue(year.totalDebt, year.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {latestFinancial !== undefined && (
            <p className="table-note">Latest annual record: {latestFinancial.asOf}</p>
          )}
        </section>

        <section className="company-card annual-comparisons">
          <header>
            <div>
              <p className="eyebrow">[02 / calculated comparisons]</p>
              <h2>Year over year</h2>
            </div>
            <span>Formula v1</span>
          </header>
          {comparisons.length === 0 ? (
            <p className="table-note">Two annual records are required for comparison.</p>
          ) : (
            <div className="financial-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>{comparisons[0].previousYear}</th>
                    <th>{comparisons[0].currentYear}</th>
                    <th>Change</th>
                    <th>Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((comparison) => (
                    <tr key={comparison.metric}>
                      <th>{comparison.label}</th>
                      <td>
                        {comparison.previous === null
                          ? "—"
                          : formatCompanyValue(comparison.previous, comparison.unit)}
                      </td>
                      <td>
                        {comparison.current === null
                          ? "—"
                          : formatCompanyValue(comparison.current, comparison.unit)}
                      </td>
                      <td>
                        {comparison.change === null
                          ? "—"
                          : formatCompanyValue(comparison.change, comparison.unit)}
                      </td>
                      <td>
                        {comparison.changePercent === null
                          ? "—"
                          : formatCompanyValue(comparison.changePercent, "percent")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {comparisons.length > 0 ? (
            <p className="table-note">
              Change % = (current − previous) ÷ |previous| × 100. A zero or missing baseline shows
              —. Formula v1. Sources:{" "}
              {comparisons[0].sourceRefs
                .map(({ sourceId, locator }) => `${sourceId} · ${locator}`)
                .join("; ")}
              .
            </p>
          ) : null}
        </section>

        <section className="company-card signal-board">
          <header>
            <div>
              <p className="eyebrow">[03 / provider measurements]</p>
              <h2>Reported ratios and growth</h2>
            </div>
          </header>
          <div className="signal-stack">
            {facts.measurements.map((measurement) => (
              <article key={measurement.id}>
                <div>
                  <span>{measurement.label}</span>
                  <strong>{formatCompanyValue(measurement.value, measurement.unit)}</strong>
                </div>
                <p>{measurement.context}</p>
                <small>
                  {measurement.asOf} ·{" "}
                  {measurement.sourceRefs
                    .map(({ sourceId, locator }) => `${sourceId} · ${locator}`)
                    .join("; ")}
                </small>
              </article>
            ))}
          </div>
        </section>

        <section className="company-card valuation-history">
          <header>
            <div>
              <p className="eyebrow">[04 / multiple history]</p>
              <h2>Reported P/E history</h2>
            </div>
          </header>
          <div className="financial-table-wrap">
            <table className="valuation-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Company P/E</th>
                  <th>Provider peer P/E</th>
                </tr>
              </thead>
              <tbody>
                {facts.valuations.map((period) => (
                  <tr key={period.id}>
                    <th>{period.year}</th>
                    <td>{period.pe === null ? "—" : formatCompanyValue(period.pe, "multiple")}</td>
                    <td>
                      {period.peerPe === null ? "—" : formatCompanyValue(period.peerPe, "multiple")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-note">
            The provider did not define the peer set. This column is a reported value, not a ranked
            comparison.
          </p>
        </section>

        <section className="company-card research-frontier">
          <header>
            <div>
              <p className="eyebrow">[05 / data coverage]</p>
              <h2>Coverage</h2>
            </div>
          </header>
          {coverage !== null && (
            <>
              <ul>
                {coverage.checks.map((check) => (
                  <li key={check.area}>
                    <span className={`coverage-dot status-${check.status}`} />
                    <div>
                      <strong>{check.area.replaceAll("_", " ")}</strong>
                      <p>{check.notes}</p>
                    </div>
                    <small>{check.status}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="company-card network-context">
          <header>
            <div>
              <p className="eyebrow">[06 / empire context]</p>
              <h2>Connected entities</h2>
            </div>
            <span>{relationships.length} links</span>
          </header>
          <ul>
            {relationships.map((relationship) => (
              <li key={relationship.id}>
                <span>{relationship.direction === "incoming" ? "←" : "→"}</span>
                <div>
                  <strong>{relationship.other.ticker ?? relationship.other.name}</strong>
                  <small>{relationship.kind.replaceAll("_", " ")}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="company-card source-ledger">
          <header>
            <div>
              <p className="eyebrow">[07 / evidence ledger]</p>
              <h2>Sectors sources</h2>
            </div>
            <span>{sources.length} records</span>
          </header>
          <ul>
            {sources.map((source) => (
              <li key={source.id}>
                <strong>{source.title}</strong>
                <code>{source.reference}</code>
                <small>
                  <span>
                    {source.access === "authenticated_api" ? "Authenticated API" : source.access}
                  </span>{" "}
                  / {source.publisher} / retrieved {source.retrievedAt}
                </small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
