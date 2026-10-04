import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { CheckDefinition } from "../../universe/checks.mjs";
import { isCustodianName, ownerKey } from "../../universe/owners.mjs";
import { checkCell, formatInput, formatValue } from "../../universe/presentation.mjs";
import { CheckInput } from "../universe/CheckInput";
import { CustodianLabel } from "../owners/CustodianLabel";
import { assess, PILLARS, verdictLabels } from "../ideas/ideas-model";
import { verdictDescriptions } from "../ideas/evidence";
import { PillarOutcome } from "../ideas/IdeasPage";
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
const holderKindLabels = { entity: "Entity", public: "Public", treasury: "Treasury" };

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
      <p>Sub-sector ranks · diamond marks {symbol}</p>
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
            <span>lowest</span>
            <span>{strip.points.length} peers</span>
            <span>highest</span>
          </div>
        </>
      ) : (
        <p>No reported peer values.</p>
      )}
      {strip.missing.length > 0 && (
        <details className="profile-peer-gaps">
          <summary>
            Check gaps: {strip.missing.length} {strip.missing.length === 1 ? "peer" : "peers"}
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
  const cell = checkCell(result, definition.unit);
  const sources = new Map(profile.sources.map((source) => [source.id, source]));
  return (
    <article className="profile-check" data-check={definition.id}>
      <header>
        <div>
          <h3>{definition.label}</h3>
          <p>{definition.question}</p>
        </div>
        <strong
          className={cell.state === "does-not-apply" ? "check-does-not-apply" : undefined}
          title={cell.reason ?? undefined}
        >
          {cell.text}
        </strong>
      </header>
      <p className="profile-check-period">{result?.period ?? "Period not reported"}</p>
      {cell.peers && <p className="profile-check-rank">{cell.peers}</p>}
      {cell.reason && <p className="profile-note">{cell.reason}</p>}
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
                  <CheckInput input={input} source={source} unit={definition.unit} />
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
          {fields.some((field) => field.unit === "IDR/share") ? "; dividends in IDR per share" : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {fields.map((field) => (
              <th key={field.key} scope="col">
                {field.label}
                {field.unit === "IDR"
                  ? " (bn)"
                  : field.unit === "IDR/share"
                    ? " (IDR/share)"
                    : " (×)"}
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
                    : fields[index].unit === "IDR/share"
                      ? formatInput(value, "total_dividend")
                      : formatValue(value, "multiple")}
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
        <strong>{formatValue(profile.company.current.freeFloat ?? null, "percent")}</strong>
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
                  <th scope="row">
                    {holding.holderKind === "entity" ? (
                      <Link to="/owner/$key" params={{ key: ownerKey(holding.holderName) }}>
                        {holding.holderName}
                      </Link>
                    ) : (
                      holding.holderName
                    )}
                    {holding.holderKind === "entity" && isCustodianName(holding.holderName) && (
                      <CustodianLabel />
                    )}
                  </th>
                  <td>{holderKindLabels[holding.holderKind]}</td>
                  <td>{formatValue(holding.percentage, "percent")}</td>
                  <td>{formatValue(holding.shares, "count")}</td>
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
            <dd>{formatValue(profile.company.current.peTtm ?? null, "multiple")}</dd>
          </div>
          <div>
            <dt>Current P/B · MRQ Q2-2026</dt>
            <dd>{formatValue(profile.company.current.pbMrq ?? null, "multiple")}</dd>
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
      <main className="page company-profile profile-state wrap" aria-busy="true">
        <p className="page-loading" role="status">
          Loading company measurements for {ticker.toUpperCase()}…
        </p>
      </main>
    );
  if (profile === null)
    return (
      <main className="page company-profile profile-state wrap">
        <h1>Company not found</h1>
        <p>No IDX company matches “{ticker.toUpperCase()}”.</p>
        <Link to="/universe">Back to Screener</Link>
      </main>
    );
  const { company } = profile;
  const { sections, note } = assembleSections(company);
  const assessment = assess({
    subSector: company.subSector,
    checks: company.checks,
    peTtm: company.current.peTtm ?? null,
  });
  return (
    <main className="page company-profile wrap">
      <header className="profile-header">
        <Link className="back" to="/universe">
          ← Screener
        </Link>
        <p className="profile-symbol">{company.symbol}</p>
        <h1>{company.name}</h1>
        <p className="profile-class">
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
            <dd>{formatValue(company.current.freeFloat ?? null, "percent")}</dd>
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
      <section className="profile-verdict" aria-labelledby="profile-verdict-title">
        <div className="verdict-head">
          <h2 id="profile-verdict-title" className={`stamp ${assessment.verdict}`}>
            {verdictLabels[assessment.verdict]}
          </h2>
          <p>{verdictDescriptions[assessment.verdict]}</p>
        </div>
        <div className="profile-pillars">
          {assessment.pillars.map((result, index) => {
            const sectionId =
              result.id === "balance"
                ? company.subSector === "Banks"
                  ? "banks"
                  : "balance-sheet"
                : result.id;
            return (
              <article key={result.id} data-pillar={result.id}>
                <PillarOutcome pillar={PILLARS[index]} result={result} />
                {sections.some(({ id }) => id === sectionId) && (
                  <a className="pillar-link" href={`#profile-${sectionId}`}>
                    View {PILLARS[index].title.toLowerCase()} inputs
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <p className="profile-note">
        Percentiles compare reported sub-sector measurements. Annual and quarterly amounts are in
        IDR billions (bn), except dividends in IDR per share. Not reported marks a gap in the
        record.
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
