import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { CheckDefinition } from "../../universe/checks.mjs";
import { isCustodianName, ownerKey } from "../../universe/owners.mjs";
import { checkCell, formatInput, formatValue, humanPeriod } from "../../universe/presentation.mjs";
import { CheckCalculation } from "../universe/CheckCalculation";
import { checkCopy, peerNoun, rankLine } from "../universe/check-copy";
import { CustodianLabel } from "../owners/CustodianLabel";
import { companyNetwork } from "../owners/network";
import { NetworkGraph } from "../owners/NetworkGraph";
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
import { TrackRecord } from "./TrackRecord";

const route = getRouteApi("/company/$ticker");

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
  if (!selected || strip.points.length < 2) return null;
  const { better } = checkCopy[definition.id];
  const place = (position: number) => (better === "lower" ? 1 - position : position);
  const [low, high] = better ? ["Worse", "Better"] : ["Lower", "Higher"];
  return (
    <div className="profile-peers">
      <span
        className="profile-peer-label"
        style={{ left: `${Math.min(Math.max(place(selected.position) * 100, 6), 94)}%` }}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <svg
        viewBox="0 0 400 24"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${symbol} against ${strip.points.length - 1} others, ${low.toLowerCase()} on the left, ${high.toLowerCase()} on the right`}
      >
        <line x1="0" x2="400" y1="12" y2="12" />
        {strip.points
          .filter((point) => !point.selected)
          .map((point) => (
            <circle key={point.symbol} cx={place(point.position) * 400} cy="12" r="3">
              <title>
                {point.symbol}: {formatValue(point.value, definition.unit)}
              </title>
            </circle>
          ))}
        <path
          className="profile-peer-subject"
          d={`M ${place(selected.position) * 400} 4 l 8 8 l -8 8 l -8 -8 Z`}
        >
          <title>
            {symbol}: {formatValue(selected.value, definition.unit)}
          </title>
        </path>
      </svg>
      <div className="profile-axis" aria-hidden="true">
        <span>{low}</span>
        <span>{high}</span>
      </div>
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
  const { symbol, subSector } = profile.company;
  const rank = rankLine(peers, symbol, checkCopy[definition.id].better, peerNoun(subSector));
  return (
    <article className="profile-check" data-check={definition.id}>
      <header>
        <div>
          <h3>{definition.label}</h3>
          <p>{definition.question}</p>
        </div>
        <p className="profile-check-value">
          <strong className={cell.state === "does-not-apply" ? "check-does-not-apply" : undefined}>
            {cell.text}
          </strong>
          {result && <small>{humanPeriod(result.period)}</small>}
        </p>
      </header>
      {cell.reason && <p className="profile-note">{cell.reason}</p>}
      {result?.value != null && rank && <p className="profile-check-rank">{rank}</p>}
      {result?.value != null && <PeerStrip peers={peers} symbol={symbol} definition={definition} />}
      {result && (
        <details className="profile-evidence">
          <summary>How it’s calculated</summary>
          <CheckCalculation
            definition={definition}
            inputs={result.inputs.map((input) => ({
              ...input,
              source: sources.get(input.sourceId),
            }))}
          />
        </details>
      )}
    </article>
  );
}

function HistoryTable({
  caption,
  period,
  rows,
  fields,
}: {
  caption: string;
  period: "Year" | "Quarter";
  rows: ReturnType<typeof extractSeries>;
  fields: readonly SeriesField[];
}) {
  const money = fields.some((field) => field.unit === "IDR");
  const gaps = rows.some((row) => row.values.includes(null));
  return (
    <>
      <div className="profile-table-wrap" tabIndex={0} role="region" aria-label={caption}>
        <table>
          <caption>
            {caption}
            {money ? ", IDR billion" : ""}
          </caption>
          <thead>
            <tr>
              <th scope="col">{period}</th>
              {fields.map((field) => (
                <th key={field.key} scope="col">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.period}>
                <th scope="row">{String(row.period).replace("-", " ")}</th>
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
      {gaps && (
        <p className="profile-table-note">
          No data means our data provider doesn’t have the figure.
        </p>
      )}
    </>
  );
}

function OwnerNetwork({ symbol }: { symbol: string }) {
  const data = useQuery(api.companyNetwork.get, { symbol });
  if (!data) return null;
  const network = companyNetwork(data);
  if (!network.branches.length) return null;
  const up = network.branches.some(({ side }) => side === "up");
  const down = network.branches.some(({ side }) => side === "down");
  return (
    <NetworkGraph network={network} label={`Who owns ${symbol}`}>
      {up && (
        <>Above, shareholders with at least 1% of {symbol} and other listed companies they own. </>
      )}
      {down && <>Below, listed companies {symbol} owns. </>}
      Bigger dots mean bigger stakes.
    </NetworkGraph>
  );
}

function Holdings({ profile }: { profile: CompanyProfile }) {
  return profile.holdings.length ? (
    <div
      className="profile-table-wrap profile-holdings"
      tabIndex={0}
      role="region"
      aria-label="Shareholders"
    >
      <table>
        <caption>Shareholders, value in IDR billion</caption>
        <thead>
          <tr>
            <th scope="col">Shareholder</th>
            <th scope="col">Stake</th>
            <th scope="col">Value</th>
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
              <td>{formatValue(holding.percentage, "percent")}</td>
              <td>{formatIdrAmount(holding.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="profile-note">No shareholder data.</p>
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
            <dt>P/E today</dt>
            <dd>{formatValue(profile.company.current.peTtm ?? null, "multiple")}</dd>
          </div>
          <div>
            <dt>P/B today</dt>
            <dd>{formatValue(profile.company.current.pbMrq ?? null, "multiple")}</dd>
          </div>
        </dl>
      )}
      {section.series.length > 0 && (
        <HistoryTable
          caption={`${section.label}, yearly figures`}
          period="Year"
          rows={extractSeries(profile.years, annualPeriods, section.series)}
          fields={section.series}
        />
      )}
      {section.id === "owners" && (
        <>
          <OwnerNetwork symbol={profile.company.symbol} />
          <Holdings profile={profile} />
        </>
      )}
    </section>
  );
}

// The last section whose top has passed a line a third of the way down the view, below the
// sticky nav, so a heading lights up once it is in the upper part of the screen.
function useCurrentSection(ids: readonly string[]) {
  const nav = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const key = ids.join(" ");
  useEffect(() => {
    const sectionIds = key.split(" ").filter(Boolean);
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = nav.current?.getBoundingClientRect().bottom ?? 0;
      const line = top + Math.max(24, (innerHeight - top) / 3);
      setCurrent(
        sectionIds.reduce<string | null>(
          (passed, id) =>
            (document.getElementById(`profile-${id}`)?.getBoundingClientRect().top ?? Infinity) <=
            line
              ? id
              : passed,
          null,
        ),
      );
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [key]);
  useEffect(() => {
    const link = nav.current?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav.current || !link) return;
    const { scrollLeft, clientWidth } = nav.current;
    if (
      link.offsetLeft < scrollLeft ||
      link.offsetLeft + link.offsetWidth > scrollLeft + clientWidth
    )
      nav.current.scrollTo({ left: link.offsetLeft - 12 });
  }, [current]);
  return { nav, current };
}

export function CompanyProfilePage() {
  const { ticker } = route.useParams();
  const profile = useQuery(api.companyProfile.get, { symbol: ticker });
  const company = profile?.company;
  const { sections, note } = company ? assembleSections(company) : { sections: [], note: null };
  const links = [
    ...sections.map(({ id, label }) => ({ id, label })),
    { id: "quarters", label: "Quarterly" },
  ];
  const { nav, current } = useCurrentSection(company ? links.map(({ id }) => id) : []);
  if (profile === undefined)
    return (
      <main className="page company-profile profile-state wrap" aria-busy="true">
        <p className="page-loading" role="status">
          Loading company measurements for {ticker.toUpperCase()}…
        </p>
      </main>
    );
  if (profile === null || !company)
    return (
      <main className="page company-profile profile-state wrap">
        <h1>Company not found</h1>
        <p>No IDX company matches “{ticker.toUpperCase()}”.</p>
        <Link to="/universe">Back to Screener</Link>
      </main>
    );
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
            .map((part) => part ?? "No data")
            .join(" › ")}
        </p>
        <dl className="profile-identity">
          <div>
            <dt>Indices</dt>
            <dd>{company.indices === null ? "No data" : company.indices.join(" · ") || "None"}</dd>
          </div>
          <div>
            <dt>Business groups</dt>
            <dd>
              {company.affiliates === null ? "No data" : company.affiliates.join(" · ") || "None"}
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
            <dd>{company.listingBoard ?? "No data"}</dd>
          </div>
          <div>
            <dt>Listed since</dt>
            <dd>{company.listingDate ?? "No data"}</dd>
          </div>
        </dl>
      </header>
      <section
        className="profile-verdict"
        aria-labelledby="profile-verdict-title"
        data-tour="verdict"
      >
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
                    See {PILLARS[index].title.toLowerCase()} details
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </section>
      {note && <p className="profile-applicability">{note}</p>}
      <TrackRecord profile={profile} />
      <nav className="profile-nav" aria-label="Company sections" ref={nav}>
        {links.map((link) => (
          <a
            key={link.id}
            href={`#profile-${link.id}`}
            aria-current={current === link.id ? "true" : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>
      {sections.map((section) => (
        <ResearchSection key={section.id} section={section} profile={profile} />
      ))}
      <section
        className="profile-section"
        id="profile-quarters"
        aria-labelledby="profile-title-quarters"
      >
        <h2 id="profile-title-quarters">Quarterly record</h2>
        <HistoryTable
          caption="Last eight quarters"
          period="Quarter"
          rows={extractSeries(profile.quarters, quarterPeriods, quarterFields)}
          fields={quarterFields}
        />
      </section>
    </main>
  );
}
