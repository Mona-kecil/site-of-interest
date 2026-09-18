import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { api } from "../../../convex/_generated/api";
import { deriveCycleLens, formatCompanyValue } from "./company-model";

const route = getRouteApi("/company/$ticker");

export function CompanyPage() {
  const { ticker } = route.useParams();
  const intelligence = useQuery(api.companies.getIntelligence, {
    empireSlug: "prajogo",
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
        <Link className="company-back-link" to="/empire/$slug" params={{ slug: "prajogo" }}>
          Return to Empire
        </Link>
      </main>
    );
  }

  const { company, coverage, facts, relationships, sources } = intelligence;
  const cycle = deriveCycleLens(facts.valuations, facts.financials, facts.signals);
  const latestFinancial = facts.financials.at(-1);

  return (
    <main className="company-page">
      <header className="company-hero">
        <div className="company-hero-copy">
          <Link className="company-back-link" to="/empire/$slug" params={{ slug: "prajogo" }}>
            ← Prajogo Empire
          </Link>
          <p className="eyebrow">
            Company intelligence <span>/</span> {company.exchange} <span>/</span> {company.country}
          </p>
          <div className="company-title-row">
            <h1>{company.ticker}</h1>
            <span>Sectors only</span>
          </div>
          <h2>{company.name}</h2>
          <p className="company-summary">{company.summary}</p>
        </div>
        <motion.aside
          className={`cycle-lens cycle-${cycle.status}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="eyebrow">Valuation cycle lens</p>
          <span className="cycle-pulse" />
          <h2>{cycle.title}</h2>
          <p>{cycle.summary}</p>
          <dl>
            <div>
              <dt>Latest P/E</dt>
              <dd>{cycle.latestPe === null ? "—" : `${cycle.latestPe.toFixed(2)}×`}</dd>
            </div>
            <div>
              <dt>Peer P/E</dt>
              <dd>{cycle.peerPe === null ? "—" : `${cycle.peerPe.toFixed(2)}×`}</dd>
            </div>
            <div>
              <dt>Peer premium</dt>
              <dd>
                {cycle.peerPremium === null ? "—" : `${(cycle.peerPremium * 100).toFixed(0)}%`}
              </dd>
            </div>
            <div>
              <dt>Quarter earnings</dt>
              <dd>{cycle.earningsGrowth === null ? "—" : `${cycle.earningsGrowth.toFixed(1)}%`}</dd>
            </div>
          </dl>
          <small>Descriptive screen, not a price forecast.</small>
        </motion.aside>
      </header>

      <section className="company-metric-strip" aria-label="Key company metrics">
        {facts.metrics.slice(0, 8).map((metric, index) => (
          <motion.article
            key={metric.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.035 }}
          >
            <p>{metric.label}</p>
            <strong>{formatCompanyValue(metric.value, metric.unit)}</strong>
            <small>As of {metric.asOf}</small>
          </motion.article>
        ))}
      </section>

      <div className="company-grid">
        <section className="company-card financial-history">
          <header>
            <div>
              <p className="eyebrow">Delivery record</p>
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
                    <td className={year.earnings < 0 ? "is-negative" : "is-positive"}>
                      {formatCompanyValue(year.earnings, year.unit)}
                    </td>
                    <td className={year.operatingCashFlow < 0 ? "is-negative" : undefined}>
                      {formatCompanyValue(year.operatingCashFlow, year.unit)}
                    </td>
                    <td className={year.freeCashFlow < 0 ? "is-negative" : undefined}>
                      {formatCompanyValue(year.freeCashFlow, year.unit)}
                    </td>
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

        <section className="company-card signal-board">
          <header>
            <div>
              <p className="eyebrow">Current readings</p>
              <h2>Signal board</h2>
            </div>
          </header>
          <div className="signal-stack">
            {facts.signals.map((signal) => (
              <article key={signal.id} className={`tone-${signal.tone}`}>
                <div>
                  <span>{signal.label}</span>
                  <strong>{formatCompanyValue(signal.value, signal.unit)}</strong>
                </div>
                <p>{signal.context}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="company-card valuation-history">
          <header>
            <div>
              <p className="eyebrow">Multiple history</p>
              <h2>P/E versus peers</h2>
            </div>
          </header>
          <div className="valuation-bars">
            {facts.valuations.map((period) => {
              const companyPe = period.pe ?? 0;
              const peerPe = period.peerPe ?? 0;
              const maximum = Math.max(Math.abs(companyPe), peerPe, 1);
              return (
                <article key={period.id}>
                  <span>{period.year}</span>
                  <div>
                    <i
                      className={companyPe < 0 ? "is-negative" : undefined}
                      style={{ width: `${Math.max((Math.abs(companyPe) / maximum) * 100, 2)}%` }}
                    />
                    <small>
                      {period.pe === null ? "N/M company" : `${period.pe.toFixed(1)}× company`}
                    </small>
                    <i className="peer-bar" style={{ width: `${(peerPe / maximum) * 100}%` }} />
                    <small>
                      {period.peerPe === null ? "N/M peers" : `${period.peerPe.toFixed(1)}× peers`}
                    </small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="company-card research-frontier">
          <header>
            <div>
              <p className="eyebrow">Research state</p>
              <h2>Coverage frontier</h2>
            </div>
            <span>{coverage?.frontier.priority ?? "unknown"} priority</span>
          </header>
          {coverage !== null && (
            <>
              <p className="next-action">{coverage.frontier.nextAction}</p>
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
              <p className="eyebrow">Empire context</p>
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
              <p className="eyebrow">Evidence ledger</p>
              <h2>Sectors sources</h2>
            </div>
            <span>{sources.length} records</span>
          </header>
          <ul>
            {sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} rel="noreferrer" target="_blank">
                  {source.title}
                </a>
                <small>
                  {source.publisher} · retrieved {source.retrievedAt}
                </small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
