import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import manifest from "../../../data/universe/manifest.json";
import { definitions } from "../../universe/checks.mjs";
import { formatValue } from "../../universe/presentation.mjs";
import { formatMarketCap, type ScreenRow } from "../universe/universe-model";
import { outcomeLabels, phrase, shortName, shortTitles, verdictDescriptions } from "./evidence";
import {
  assess,
  PILLARS,
  verdictLabels,
  type CompanyClass,
  type Rule,
  type Verdict,
} from "./ideas-model";
import { OutcomeMark } from "./OutcomeMark";

const classLabels: Record<CompanyClass, string> = {
  nonFinancial: "Non-financial companies",
  bank: "Banks",
  otherFinancial: "Insurance, financing and investment companies",
};
const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
const labelOf = (key: string) =>
  key === "pe_ttm" ? "Current P/E" : definitionById.get(key)!.label;
type PillarResult = ReturnType<typeof assess>["pillars"][number];
type Evidence = PillarResult["evidence"][number];

function RuleText({ rule }: { rule: Rule | Evidence }) {
  const definition = definitionById.get(rule.key);
  const label = labelOf(rule.key);
  const unit = rule.key === "pe_ttm" ? "multiple" : definition!.unit;
  const pass = rule.pass && `passes ${phrase(rule.pass, rule.key)}`;
  const flag = rule.fail && `flagged ${phrase(rule.fail, rule.key)}`;
  if (!("result" in rule)) return <>{`${label}: ${[pass, flag].filter(Boolean).join(" · ")}`}</>;
  const threshold =
    rule.result === "fail"
      ? flag
      : rule.result === "neutral" && rule.pass
        ? `passes only ${phrase(rule.pass, rule.key)}`
        : (pass ?? `flagged only ${phrase(rule.fail!, rule.key)}`);
  return <>{`${label} ${formatValue(rule.value, unit)} · ${threshold}`}</>;
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
      <OutcomeMark outcome={result.outcome} />
      <h3>
        {pillar.title}: {outcomeLabels[result.outcome]}
      </h3>
      {result.outcome === "na" ? (
        <p>Not checked for this kind of company.</p>
      ) : result.outcome === "unknown" ? (
        <p>Our data provider doesn’t have the figures.</p>
      ) : (
        <p>{result.headline}</p>
      )}
      {result.evidence.length > 0 && (
        <ul>
          {result.evidence.map((evidence) => (
            <li key={evidence.key}>
              <RuleText rule={evidence} />
            </li>
          ))}
          {result.missing.map((rule) => (
            <li key={rule.key}>{labelOf(rule.key)}: No data</li>
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
        <Link className="idea-name" to="/company/$ticker" params={{ ticker: company.symbol }}>
          {shortName(company.name)}
        </Link>
        <p>
          {company.subSector ?? "Sub-sector unknown"} · {formatMarketCap(company.marketCap)}
        </p>
      </header>
      <ol className="idea-marks" aria-label="Pillar outcomes">
        {assessment.pillars.map((result, index) => (
          <li key={result.id}>
            <OutcomeMark outcome={result.outcome} />
            <span aria-hidden="true">{shortTitles[index]}</span>
            <span className="sr-only">
              {PILLARS[index].title}: {outcomeLabels[result.outcome]}
            </span>
          </li>
        ))}
      </ol>
      <ul className="idea-reasons">
        {reasons.map(({ id, outcome, evidence, missing, headline }) => {
          const pillar = PILLARS.find((item) => item.id === id)!;
          return (
            <li key={id}>
              <OutcomeMark outcome={outcome} />
              <div>
                <strong>
                  {outcome === "na"
                    ? `${pillar.title}: not checked for this kind of company`
                    : outcome === "unknown"
                      ? `${pillar.title}: no data`
                      : headline}
                </strong>
                {(assessment.verdict === "flags"
                  ? evidence.filter(({ result }) => result === "fail")
                  : outcome === "pass"
                    ? evidence.slice(0, 1)
                    : evidence
                ).map((item) => (
                  <span key={item.key}>
                    <RuleText rule={item} />
                  </span>
                ))}
                {outcome === "mixed" &&
                  missing.map((rule) => <span key={rule.key}>{labelOf(rule.key)}: No data</span>)}
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function IdeasPage() {
  const companies = useQuery(api.universe.screen, {});
  const [showIdeas, setShowIdeas] = useState(false);
  const [showFlags, setShowFlags] = useState(false);
  const assessed = (companies ?? []).map((company) => ({ company, assessment: assess(company) }));
  const ideas = assessed
    .filter(
      ({ company, assessment }) =>
        company.marketCap !== null && company.marketCap >= 1e12 && assessment.verdict === "idea",
    )
    .sort(
      (a, b) =>
        b.assessment.pillars.filter(({ outcome }) => outcome === "pass").length -
          a.assessment.pillars.filter(({ outcome }) => outcome === "pass").length ||
        b.company.marketCap! - a.company.marketCap!,
    );
  const flags = assessed
    .filter(
      ({ company, assessment }) =>
        company.marketCap !== null && company.marketCap >= 1e12 && assessment.verdict === "flags",
    )
    .sort((a, b) => b.company.marketCap! - a.company.marketCap!);
  return (
    <main className="page ideas-page wrap">
      <header className="page-head">
        <h1>Ideas</h1>
        <div className="page-intro">
          <p>
            Site of Interest screens all {manifest.companyCount} IDX companies on five questions:
            does profit turn into cash, does the business earn well on its capital, can the balance
            sheet take a hit, is the price too high for what it earns, and are minority holders
            treated fairly.
          </p>
        </div>
      </header>
      <details className="ideas-method">
        <summary>How a stock makes the list</summary>
        <div className="ideas-method-body">
          <p>
            Each rule compares one measurement with a pass line, a flag line, or both. A pillar is
            flagged when any rule crosses its flag line, and passes only when every pass line has a
            number that clears it. A missing number can’t earn a pass and is never counted as zero,
            so the pillar partly passes instead. A pillar with no numbers at all shows No data.
            Insurance, financing and investment companies have no balance-sheet rules here, so they
            can be Mixed at best.
          </p>
          <dl>
            {(["idea", "mixed", "flags", "thin"] as const).map((verdict) => (
              <div key={verdict}>
                <dt>
                  <span className={`stamp ${verdict}`}>{verdictLabels[verdict]}</span>
                </dt>
                <dd>{verdictDescriptions[verdict]}</dd>
              </div>
            ))}
          </dl>
          <div className="ideas-rules">
            {PILLARS.map((pillar) => {
              const groups = new Map<string, { rules: Rule[]; classes: CompanyClass[] }>();
              for (const [companyClass, rules] of Object.entries(pillar.rules) as [
                CompanyClass,
                Rule[],
              ][]) {
                const key = JSON.stringify(rules);
                groups.set(key, {
                  rules,
                  classes: [...(groups.get(key)?.classes ?? []), companyClass],
                });
              }
              return (
                <section key={pillar.id}>
                  <h2>{pillar.title}</h2>
                  <p>{pillar.question}</p>
                  {[...groups.values()].map(({ rules, classes }) => (
                    <div key={classes.join()}>
                      <h3>
                        {classes.length === 3
                          ? "All companies"
                          : classes.map((item) => classLabels[item]).join(" · ")}
                      </h3>
                      {rules.length ? (
                        <ul>
                          {rules.map((rule) => (
                            <li key={rule.key}>
                              <RuleText rule={rule} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Not checked.</p>
                      )}
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      </details>
      {companies === undefined ? (
        <p className="page-loading" role="status">
          Loading ideas
        </p>
      ) : (
        <>
          <section aria-labelledby="ideas-list-title" className="ideas-list" data-tour="ideas">
            <div className="ideas-list-head">
              <h2 id="ideas-list-title">Worth a look · {ideas.length}</h2>
              <p>
                Companies worth at least IDR 1T: {ideas.length} of the{" "}
                {assessed.filter(({ assessment }) => assessment.verdict === "idea").length} across
                the market. Most passing pillars first, then largest market cap.
              </p>
            </div>
            <div className="ideas-grid">
              {(showIdeas ? ideas : ideas.slice(0, 12)).map((item) => (
                <CompanyCard key={item.company.symbol} {...item} />
              ))}
            </div>
            {ideas.length === 0 && <p>No companies meet these rules.</p>}
            {!showIdeas && ideas.length > 12 && (
              <button className="more" type="button" onClick={() => setShowIdeas(true)}>
                Show all {ideas.length} worth a look companies
              </button>
            )}
          </section>
          <section id="red-flags" aria-labelledby="flags-list-title" className="ideas-list">
            <div className="ideas-list-head">
              <h2 id="flags-list-title">Red flags · {flags.length}</h2>
              <p>
                Companies worth at least IDR 1T: {flags.length} of the{" "}
                {assessed.filter(({ assessment }) => assessment.verdict === "flags").length} across
                the market. Largest market cap first.
              </p>
            </div>
            <div className="ideas-grid">
              {(showFlags ? flags : flags.slice(0, 12)).map((item) => (
                <CompanyCard key={item.company.symbol} {...item} />
              ))}
            </div>
            {flags.length === 0 && <p>No companies meet these rules.</p>}
            {!showFlags && flags.length > 12 && (
              <button className="more" type="button" onClick={() => setShowFlags(true)}>
                Show all {flags.length} red flag companies
              </button>
            )}
          </section>
        </>
      )}
      <p className="ideas-end">
        <Link className="go" to="/universe">
          Open the screener for all {manifest.companyCount} companies
        </Link>
      </p>
    </main>
  );
}
