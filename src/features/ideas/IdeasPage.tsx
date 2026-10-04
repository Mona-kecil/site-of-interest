import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import manifest from "../../../data/universe/manifest.json";
import { definitions } from "../../universe/checks.mjs";
import { formatValue } from "../../universe/presentation.mjs";
import { formatMarketCap, type ScreenRow } from "../universe/universe-model";
import {
  assess,
  PILLARS,
  type CompanyClass,
  type Outcome,
  type Rule,
  type Verdict,
} from "./ideas-model";

export const verdictLabels: Record<Verdict, string> = {
  idea: "Worth a look",
  mixed: "Mixed",
  flags: "Red flags",
  thin: "Not enough data",
};
export const outcomeLabels: Record<Outcome, string> = {
  pass: "Pass",
  mixed: "Mixed",
  fail: "Fail",
  unknown: "Inputs not reported",
  na: "Does not apply",
};
export const verdictDescriptions: Record<Verdict, string> = {
  idea: "At least three pillars have data, the core pillars pass, and at most one applicable pillar is mixed or missing inputs.",
  mixed:
    "At least three pillars have data and none fail, but the core or remaining pillars do not clear the Worth a look rules.",
  flags: "At least one reported rule fails, even when other inputs are missing.",
  thin: "No pillar fails, but fewer than three pillars have reported inputs.",
};
const classLabels: Record<CompanyClass, string> = {
  nonFinancial: "Non-financial companies",
  bank: "Banks",
  otherFinancial: "Other financial companies",
};
const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
type PillarResult = ReturnType<typeof assess>["pillars"][number];

export function RuleText({
  rule,
  evidence,
}: {
  rule: Rule;
  evidence?: PillarResult["evidence"][number];
}) {
  const definition = definitionById.get(rule.key);
  const label = rule.key === "pe_ttm" ? "Current P/E" : definition!.label;
  const unit = rule.key === "pe_ttm" ? "multiple" : definition!.unit;
  const pass = rule.pass && `${rule.pass[0]} ${formatValue(rule.pass[1], unit)}`;
  const fail = rule.fail && `${rule.fail[0]} ${formatValue(rule.fail[1], unit)}`;
  return (
    <>
      {label}: {evidence ? `${formatValue(evidence.value, unit)}; ` : ""}
      {evidence
        ? evidence.result === "fail"
          ? `flags ${fail}`
          : evidence.result === "neutral"
            ? `misses pass ${pass}`
            : pass
              ? `meets pass ${pass}`
              : `passes; flag ${fail} not met`
        : [pass ? `pass ${pass}` : null, fail ? `flag ${fail}` : null].filter(Boolean).join("; ")}
    </>
  );
}

export function PillarOutcome({
  pillar,
  result,
}: {
  pillar: (typeof PILLARS)[number];
  result: PillarResult;
}) {
  return (
    <div className="idea-reason">
      <h3>
        {pillar.title}: {outcomeLabels[result.outcome]}
      </h3>
      {result.outcome === "na" ? (
        <p>The screen does not apply this pillar to this kind of company.</p>
      ) : result.outcome === "unknown" ? (
        <p>The inputs are not reported.</p>
      ) : (
        <p>{pillar.headlines[result.outcome]}</p>
      )}
      {result.evidence.length > 0 && (
        <ul>
          {result.evidence.map((evidence) => (
            <li key={evidence.key}>
              <RuleText
                rule={Object.values(pillar.rules)
                  .flat()
                  .find(({ key }) => key === evidence.key)!}
                evidence={evidence}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CompanyCard({
  company,
  assessment,
}: {
  company: ScreenRow;
  assessment: ReturnType<typeof assess>;
}) {
  const reasons = assessment.pillars.filter(({ outcome }) =>
    assessment.verdict === "flags" ? outcome === "fail" : outcome !== "na",
  );
  return (
    <article className="idea-card" data-symbol={company.symbol}>
      <header>
        <h3>
          <Link to="/company/$ticker" params={{ ticker: company.symbol }}>
            {company.symbol}
          </Link>
        </h3>
        <Link to="/company/$ticker" params={{ ticker: company.symbol }}>
          {company.name}
        </Link>
        <p>
          {company.subSector ?? "Sub-sector not reported"} · {formatMarketCap(company.marketCap)}
        </p>
      </header>
      <div className="idea-chips" aria-label="Pillar outcomes">
        {assessment.pillars.map((result, index) => (
          <span className={`outcome-chip outcome-${result.outcome}`} key={result.id}>
            {PILLARS[index].title}: {outcomeLabels[result.outcome]}
          </span>
        ))}
      </div>
      <div className="idea-reasons">
        {reasons.map((result) => (
          <PillarOutcome
            key={result.id}
            pillar={PILLARS.find(({ id }) => id === result.id)!}
            result={{
              ...result,
              evidence:
                assessment.verdict === "flags"
                  ? result.evidence.filter(({ result }) => result === "fail")
                  : result.outcome === "pass"
                    ? result.evidence.slice(0, 1)
                    : result.evidence,
            }}
          />
        ))}
      </div>
    </article>
  );
}

export function IdeasPage() {
  const companies = useQuery(api.universe.screen, {});
  const [showIdeas, setShowIdeas] = useState(false);
  const [showFlags, setShowFlags] = useState(false);
  const assessed = (companies ?? [])
    .filter(({ marketCap }) => marketCap !== null && marketCap >= 1e12)
    .map((company) => ({ company, assessment: assess(company) }));
  const ideas = assessed
    .filter(({ assessment }) => assessment.verdict === "idea")
    .sort(
      (a, b) =>
        b.assessment.pillars.filter(({ outcome }) => outcome === "pass").length -
          a.assessment.pillars.filter(({ outcome }) => outcome === "pass").length ||
        b.company.marketCap! - a.company.marketCap!,
    );
  const flags = assessed
    .filter(({ assessment }) => assessment.verdict === "flags")
    .sort((a, b) => b.company.marketCap! - a.company.marketCap!);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(manifest.retrievedAt));
  return (
    <main className="universe-page ideas-page">
      <header className="universe-header">
        <p className="eyebrow">[IDX / ideas]</p>
        <h1>Ideas</h1>
        <p>
          Site of Interest screens all {manifest.companyCount} IDX companies the way value investor
          Ricky Ho reads a business: cash before profit, returns on capital, a balance sheet that
          can take a hit, a price that does not assume perfection, fair treatment of minority
          holders.
        </p>
        <p className="universe-note">
          Sectors data retrieved {date} · FY2025 annual reports and current market data ·
          Rules-based screen · Not investment advice.
        </p>
      </header>
      <details className="ideas-method">
        <summary>How a stock makes the list</summary>
        <div className="ideas-rules">
          {PILLARS.map((pillar) => (
            <section key={pillar.id}>
              <h2>{pillar.title}</h2>
              <p>{pillar.question}</p>
              {(Object.entries(pillar.rules) as [CompanyClass, Rule[]][]).map(
                ([companyClass, rules]) => (
                  <div key={companyClass}>
                    <h3>{classLabels[companyClass]}</h3>
                    {rules.length ? (
                      <ul>
                        {rules.map((rule) => (
                          <li key={rule.key}>
                            <RuleText rule={rule} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Does not apply.</p>
                    )}
                  </div>
                ),
              )}
            </section>
          ))}
        </div>
        <p>
          Missing values add no evidence. A pillar fails if any rule fails, passes if all reported
          rules pass, and is mixed otherwise. No reported rules means inputs not reported; an empty
          rule list means does not apply. Fail-only rules pass when their flag threshold is not met.
        </p>
        <p>
          Core pillars: cash and balance sheet for non-financial companies; returns and balance
          sheet for banks and other financial companies. Other financial companies cannot be Worth a
          look because their balance pillar does not apply.
        </p>
        <dl>
          {(Object.keys(verdictLabels) as Verdict[]).map((verdict) => (
            <div key={verdict}>
              <dt>{verdictLabels[verdict]}</dt>
              <dd>{verdictDescriptions[verdict]}</dd>
            </div>
          ))}
        </dl>
      </details>
      {companies === undefined ? (
        <p role="status">Loading ideas</p>
      ) : (
        <>
          <section aria-labelledby="ideas-list-title" className="ideas-list">
            <h2 id="ideas-list-title">Worth a look · {ideas.length}</h2>
            <p className="universe-note">
              Market cap at least IDR 1T. Most passing pillars first, then largest market cap.
            </p>
            <div className="ideas-grid">
              {(showIdeas ? ideas : ideas.slice(0, 12)).map((item) => (
                <CompanyCard key={item.company.symbol} {...item} />
              ))}
            </div>
            {ideas.length === 0 && <p>No companies meet these rules.</p>}
            {!showIdeas && ideas.length > 12 && (
              <button type="button" onClick={() => setShowIdeas(true)}>
                Show all {ideas.length} worth a look companies
              </button>
            )}
          </section>
          <section aria-labelledby="flags-list-title" className="ideas-list">
            <h2 id="flags-list-title">Red flags · {flags.length}</h2>
            <p className="universe-note">Market cap at least IDR 1T. Largest market cap first.</p>
            <div className="ideas-grid">
              {(showFlags ? flags : flags.slice(0, 12)).map((item) => (
                <CompanyCard key={item.company.symbol} {...item} />
              ))}
            </div>
            {flags.length === 0 && <p>No companies meet these rules.</p>}
            {!showFlags && flags.length > 12 && (
              <button type="button" onClick={() => setShowFlags(true)}>
                Show all {flags.length} red flag companies
              </button>
            )}
          </section>
        </>
      )}
      <footer className="ideas-footer">
        <p>
          Not affiliated with or endorsed by Ricky Ho. Verdicts apply fixed rules to provider
          numbers and inherit provider errors. Not investment advice.
        </p>
        <Link to="/universe">
          Open the screener for all {manifest.companyCount} companies, including those under IDR 1T
        </Link>
      </footer>
    </main>
  );
}
