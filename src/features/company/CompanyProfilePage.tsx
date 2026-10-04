import { getRouteApi } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { CheckDefinition } from "../../universe/checks.mjs";
import { formatInput, formatPeers, formatValue } from "../universe/universe-model";
import {
  annualPeriods,
  assembleSections,
  extractSeries,
  formatIdr,
  formatIdrAmount,
  orderHoldings,
  peerStrip,
  quarterFields,
  quarterPeriods,
  type CompanyProfile,
  type Peer,
  type ProfileCheck,
  type ProfileSection,
  type SeriesField,
} from "./profile-model";

const route = getRouteApi("/company/$ticker");
const reportedValue = (value: number | null, unit: CheckDefinition["unit"]) =>
  value === null ? "Not reported" : formatValue(value, unit);

function PeerStrip({
  peers,
  symbol,
  definition,
}: {
  peers: Peer[];
  symbol: string;
  definition: CheckDefinition;
}) {
  const strip = peerStrip(peers, symbol);
  const selected = strip.points.find((point) => point.selected);
  return (
    <div className="profile-peers">
      <p>Sub-sector values · diamond marks {symbol}</p>
      {strip.points.length ? (
        <>
          <svg
            viewBox="0 0 400 36"
            role="img"
            aria-label={`${definition.label}: ${strip.points.length} reported sub-sector peers; ${symbol} marked by a diamond`}
          >
            <line x1="12" x2="388" y1="18" y2="18" />
            {strip.points.map((point) => (
              <circle key={point.symbol} cx={12 + point.position * 376} cy="18" r="3">
                <title>
                  {point.symbol}: {formatValue(point.value, definition.unit)}
                </title>
              </circle>
            ))}
            {selected && (
              <path
                className="profile-peer-subject"
                d={`M ${12 + selected.position * 376} 10 l 8 8 l -8 8 l -8 -8 Z`}
              >
                <title>
                  {symbol}: {formatValue(selected.value, definition.unit)}
                </title>
              </path>
            )}
          </svg>
          <div className="profile-axis">
            <span>{reportedValue(strip.min, definition.unit)}</span>
            <span>{reportedValue(strip.max, definition.unit)}</span>
          </div>
        </>
      ) : (
        <p>No reported peer values.</p>
      )}
      {strip.missing.length > 0 && (
        <details className="profile-peer-gaps">
          <summary>
            Not reported: {strip.missing.length} {strip.missing.length === 1 ? "peer" : "peers"}
            {strip.missing.includes(symbol) ? `, including ${symbol}` : ""}
          </summary>
          <p>{strip.missing.join(", ")}</p>
        </details>
      )}
    </div>
  );
}

function CheckCard({
  definition,
  result,
  peers,
  profile,
}: {
  definition: CheckDefinition;
  result?: ProfileCheck;
  peers: Peer[];
  profile: CompanyProfile;
}) {
  const sources = new Map(profile.sources.map((source) => [source.id, source]));
  return (
    <article className="profile-check" data-check={definition.id}>
      <header>
        <div>
          <h3>{definition.label}</h3>
          <p>
            {definition.id === "fcf_yield"
              ? "What is free cash flow relative to the current market cap?"
              : definition.question}
          </p>
        </div>
        <strong>{reportedValue(result?.value ?? null, definition.unit)}</strong>
      </header>
      <p className="profile-check-period">{result?.period ?? "Period not reported"}</p>
      <p className="profile-check-rank">
        {formatPeers(result?.percentile ?? null, result?.peerCount ?? 0)}
      </p>
      {result?.percentile == null && (
        <p className="profile-note">Sub-sector percentile not reported.</p>
      )}
      {result?.value == null && (
        <p className="profile-note">{result?.gap ?? "Not reported: no stored check result"}</p>
      )}
      <PeerStrip peers={peers} symbol={profile.company.symbol} definition={definition} />
      <details className="profile-evidence">
        <summary>Formula and inputs · {definition.label}</summary>
        <dl>
          <div>
            <dt>Formula</dt>
            <dd>{definition.formula}</dd>
          </div>
        </dl>
        {result?.inputs.length ? (
          <ol>
            {result.inputs.map((input, index) => {
              const source = sources.get(input.sourceId);
              return (
                <li key={`${input.field}:${index}`}>
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
                      <dd>{source?.title ?? `Source not reported: ${input.sourceId}`}</dd>
                    </div>
                    <div>
                      <dt>Endpoint</dt>
                      <dd>
                        <code>{source?.endpoint ?? "Not reported"}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Retrieved</dt>
                      <dd>
                        {source ? (
                          <time dateTime={source.retrievedAt}>{source.retrievedAt}</time>
                        ) : (
                          "Not reported"
                        )}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ol>
        ) : (
          <p>Inputs not reported.</p>
        )}
      </details>
    </article>
  );
}

function HistoryTable({
  label,
  rows,
  fields,
}: {
  label: string;
  rows: ReturnType<typeof extractSeries>;
  fields: readonly SeriesField[];
}) {
  return (
    <div className="profile-table-wrap" tabIndex={0} role="region" aria-label={label}>
      <table>
        <caption>
          {label} · IDR billions (bn)
          {fields.some((field) => field.unit === "multiple")
            ? "; P/E and P/B in multiples (×)"
            : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {fields.map((field) => (
              <th key={field.key} scope="col">
                {field.label}
                {field.unit === "IDR" ? " (bn)" : " (×)"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period}>
              <th scope="row">{row.period}</th>
              {row.values.map((value, index) => (
                <td key={fields[index].key} data-reported={value !== null}>
                  {fields[index].unit === "IDR"
                    ? formatIdrAmount(value)
                    : reportedValue(value, "multiple")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Holdings({ profile }: { profile: CompanyProfile }) {
  return (
    <div className="profile-holdings">
      <p>
        Free float:{" "}
        <strong>{reportedValue(profile.company.current.freeFloat ?? null, "percent")}</strong>
      </p>
      {profile.holdings.length ? (
        <div className="profile-table-wrap" tabIndex={0} role="region" aria-label="Holdings table">
          <table>
            <caption>Holdings · value in IDR billions (bn)</caption>
            <thead>
              <tr>
                <th scope="col">Holder</th>
                <th scope="col">Kind</th>
                <th scope="col">%</th>
                <th scope="col">Shares</th>
                <th scope="col">Value (bn)</th>
              </tr>
            </thead>
            <tbody>
              {orderHoldings(profile.holdings).map((holding) => (
                <tr key={holding._id}>
                  <th scope="row">{holding.holderName}</th>
                  <td>
                    {holding.holderKind === "entity"
                      ? "Entity"
                      : holding.holderKind === "public"
                        ? "Public"
                        : "Treasury"}
                  </td>
                  <td>{reportedValue(holding.percentage, "percent")}</td>
                  <td>{reportedValue(holding.shares, "count")}</td>
                  <td>{formatIdrAmount(holding.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Holdings not reported.</p>
      )}
    </div>
  );
}

function ResearchSection({
  section,
  profile,
}: {
  section: ProfileSection;
  profile: CompanyProfile;
}) {
  return (
    <section
      className="profile-section"
      id={`profile-${section.id}`}
      aria-labelledby={`profile-title-${section.id}`}
    >
      <h2 id={`profile-title-${section.id}`}>{section.label}</h2>
      <div className="profile-checks">
        {section.checks.map((definition) => (
          <CheckCard
            key={definition.id}
            definition={definition}
            result={profile.checks.find((check) => check.checkId === definition.id)}
            peers={profile.peers.find((peers) => peers.checkId === definition.id)?.values ?? []}
            profile={profile}
          />
        ))}
      </div>
      {section.id === "price" && (
        <dl className="profile-current-price">
          <div>
            <dt>Current P/E · TTM Q3-2025–Q2-2026</dt>
            <dd>{reportedValue(profile.company.current.peTtm ?? null, "multiple")}</dd>
          </div>
          <div>
            <dt>Current P/B · MRQ Q2-2026</dt>
            <dd>{reportedValue(profile.company.current.pbMrq ?? null, "multiple")}</dd>
          </div>
        </dl>
      )}
      {section.series.length > 0 && (
        <HistoryTable
          label={`${section.label} annual history · 2019–2025`}
          rows={extractSeries(profile.years, annualPeriods, section.series)}
          fields={section.series}
        />
      )}
      {section.id === "owners" && <Holdings profile={profile} />}
    </section>
  );
}

export function CompanyProfilePage() {
  const { ticker } = route.useParams();
  const profile = useQuery(api.companyProfile.get, { symbol: ticker });
  if (profile === undefined)
    return (
      <main className="company-profile profile-state" aria-busy="true">
        <p role="status">Loading company measurements for {ticker.toUpperCase()}…</p>
      </main>
    );
  if (profile === null)
    return (
      <main className="company-profile profile-state">
        <h1>Company not found</h1>
        <p>No IDX company matches “{ticker.toUpperCase()}”.</p>
        <a href="/universe">Back to Universe</a>
      </main>
    );
  const { company } = profile;
  const { sections, note } = assembleSections(company);
  return (
    <main className="company-profile">
      <header className="profile-header">
        <a href="/universe">← Universe</a>
        <p className="profile-kicker">IDX / {company.symbol}</p>
        <h1>{company.name}</h1>
        <p className="profile-symbol">{company.symbol}</p>
        <p>
          {[company.sector, company.subSector, company.industry]
            .map((part) => part ?? "Not reported")
            .join(" › ")}
        </p>
        <dl className="profile-identity">
          <div>
            <dt>Indices</dt>
            <dd>
              {company.indices === null
                ? "Not reported"
                : company.indices.join(" · ") || "None reported"}
            </dd>
          </div>
          <div>
            <dt>Business groups</dt>
            <dd>
              {company.affiliates === null
                ? "Not reported"
                : company.affiliates.join(" · ") || "None reported"}
            </dd>
          </div>
          <div>
            <dt>Market cap</dt>
            <dd>{formatIdr(company.current.marketCap ?? null)}</dd>
          </div>
          <div>
            <dt>Free float</dt>
            <dd>{reportedValue(company.current.freeFloat ?? null, "percent")}</dd>
          </div>
          <div>
            <dt>Listing board</dt>
            <dd>{company.listingBoard ?? "Not reported"}</dd>
          </div>
          <div>
            <dt>Listing date</dt>
            <dd>{company.listingDate ?? "Not reported"}</dd>
          </div>
        </dl>
      </header>
      <p className="profile-note">
        Percentiles compare reported sub-sector measurements. Annual and quarterly amounts are in
        IDR billions (bn). Not reported marks a gap in the record.
      </p>
      {note && <p className="profile-applicability">{note}</p>}
      <nav className="profile-nav" aria-label="Company sections">
        {sections.map((section) => (
          <a key={section.id} href={`#profile-${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>
      {sections.map((section) => (
        <ResearchSection key={section.id} section={section} profile={profile} />
      ))}
      <section className="profile-section" aria-labelledby="profile-quarter-title">
        <h2 id="profile-quarter-title">Quarterly record</h2>
        <HistoryTable
          label="Eight quarters · Q3-2024–Q2-2026"
          rows={extractSeries(profile.quarters, quarterPeriods, quarterFields)}
          fields={quarterFields}
        />
      </section>
    </main>
  );
}
