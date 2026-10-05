import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { api } from "../../../convex/_generated/api";
import manifest from "../../../data/universe/manifest.json";
import { humanPeriod, sourceLine } from "../../universe/presentation.mjs";
import {
  deciding,
  formatLine,
  formatReading,
  MEASURES,
  phrase,
  ruleLines,
  shortName,
  outcomeLabels,
  shortTitles,
  verdictDescriptions,
} from "../ideas/evidence";
import { assess, PILLARS, verdictLabels, type Outcome, type Verdict } from "../ideas/ideas-model";
import { OutcomeMark } from "../ideas/OutcomeMark";
import { formatMarketCap, type ScreenRow } from "../universe/universe-model";
import "./landing.css";

type Company = ScreenRow & { shortName: string; assessment: ReturnType<typeof assess> };

const FEATURED = ["TLKM", "DCII", "BBCA", "GOTO", "BBRI", "ASII", "AMMN", "ICBP"];
const RULERS = [
  {
    pillar: 0,
    key: "cash_conversion",
    metric: "Cash conversion",
    period: "Operating cash flow ÷ earnings, FY2023–FY2025",
    scope: "Non-financial companies",
    min: -0.5,
    max: 3,
    pins: ["TLKM", "TPIA"],
    note: [
      "Free cash flow must also be positive.",
      "Not checked for banks and other financial companies.",
    ],
  },
  {
    pillar: 1,
    key: "roic",
    metric: "Return on invested capital",
    period: "FY2025",
    scope: "Every company",
    min: -0.1,
    max: 0.3,
    pins: ["TLKM", "GOTO"],
    note: ["Banks and other financial companies use return on equity", ", with the same lines."],
  },
  {
    pillar: 2,
    key: "net_debt_to_ebitda",
    metric: "Net debt ÷ EBITDA",
    period: "FY2025",
    scope: "Every company",
    min: 0,
    max: 7,
    pins: ["TLKM", "AMMN"],
    note: [
      "Interest coverage passes at 4× or more and is flagged below 1.5×.",
      "Banks are checked on NPL ratio, capital adequacy and loan to deposit instead.",
    ],
  },
  {
    pillar: 3,
    key: "pe_vs_history",
    metric: "P/E against its own history",
    period: "Today’s P/E ÷ its median since 2020",
    scope: "Every company",
    min: 0,
    max: 2.5,
    pins: ["TLKM", "DCII"],
    note: [
      "Any P/E above 50 is flagged.",
      "Non-financial companies also need a free cash flow yield of 5% or more to pass.",
    ],
  },
  {
    pillar: 4,
    key: "share_dilution",
    metric: "Share dilution",
    period: "Change in share count, 2020–2025",
    scope: "Every company",
    min: -0.1,
    max: 0.6,
    pins: ["TLKM", "ISAT"],
    note: [
      "Four or more years of dividends out of six pass. A free float under 10% is flagged.",
      "",
    ],
  },
];
const retrieved = new Date(manifest.retrievedAt);
const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).format(retrieved);
const count = (value: number) => value.toLocaleString("en-US");
const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

function Arrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Stamp({ verdict, style }: { verdict: Verdict; style?: CSSProperties }) {
  return (
    <span className={`stamp ${verdict}`} style={style}>
      {verdictLabels[verdict]}
    </span>
  );
}

export function LandingPage() {
  const rows = useQuery(api.universe.screen, {});
  const check = useQuery(api.universe.check, { symbol: "TLKM", checkId: "cash_conversion" });
  const companies = useMemo(
    () => rows?.map((row) => ({ ...row, shortName: shortName(row.name), assessment: assess(row) })),
    [rows],
  );
  const bySymbol = useMemo(
    () => new Map((companies ?? []).map((company) => [company.symbol, company])),
    [companies],
  );
  if (!companies) {
    return (
      <main className="landing wrap">
        <p className="landing-loading" role="status">
          Rating {manifest.companyCount} companies
        </p>
      </main>
    );
  }
  const tally = (list: Company[], verdict: Verdict) =>
    list.filter(({ assessment }) => assessment.verdict === verdict).length;
  const large = companies.filter(({ marketCap }) => marketCap !== null && marketCap >= 1e12);
  const telkom = bySymbol.get("TLKM")!;
  return (
    <main className="landing wrap">
      <section className="opening" aria-labelledby="headline">
        <h1 id="headline">
          {count(tally(companies, "idea"))} of {count(companies.length)} IDX companies are worth a
          look. <span>{count(tally(companies, "flags"))} raise a red flag.</span>
        </h1>
        <p className="standfirst">
          Site of Interest asks every company on the IDX the five questions a careful owner would
          ask of a business, <strong>with the pass and flag lines in the open.</strong> Every
          verdict leads back to the Sectors numbers behind it.
        </p>
      </section>

      <Ratings companies={companies} bySymbol={bySymbol} />

      <section className="block" aria-labelledby="checks-title">
        <div className="block-head">
          <h2 id="checks-title">Five questions, asked of every company.</h2>
          <p>
            Each question is answered by a measurement and judged against two lines: a pass line and
            a flag line. The lines are our own defaults, not an industry standard, and every one of
            them is on this page.
          </p>
        </div>
        {RULERS.map((ruler) => (
          <Ruler key={ruler.key} ruler={ruler} bySymbol={bySymbol} />
        ))}
        <div className="verdict-rule">
          <h3>Then the marks become a verdict.</h3>
          <ol>
            {(["flags", "idea", "mixed", "thin"] as const).map((verdict) => (
              <li key={verdict}>
                <span>
                  <Stamp verdict={verdict} />
                </span>
                <p>{verdictDescriptions[verdict]}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="block" aria-labelledby="trace-title">
        <div className="block-head">
          <h2 id="trace-title">Follow one number back to its source.</h2>
          <p>
            Any mark on the site walks back to the rows Sectors sent. Here is how Telkom’s cash mark
            is made.
          </p>
        </div>
        {check && check.value !== null ? (
          <Trace company={telkom} check={{ ...check, value: check.value }} />
        ) : (
          <p className="landing-loading" role="status">
            Loading Telkom’s inputs
          </p>
        )}
        <div className="trace-foot">
          <Link className="go" to="/company/$ticker" params={{ ticker: "TLKM" }}>
            Open Telkom’s full evidence <Arrow />
          </Link>
        </div>
      </section>

      <section className="block" aria-labelledby="start-title">
        <div className="block-head">
          <h2 id="start-title">Where to start.</h2>
        </div>
        <ul className="starts">
          <li>
            <Link to="/ideas">
              <h3>Worth a look</h3>
              <p>
                <b>{count(tally(large, "idea"))}</b> companies worth at least IDR 1T clear every
                flag line and pass the core checks.
              </p>
              <span className="arrow">
                Open Ideas <Arrow />
              </span>
            </Link>
          </li>
          <li>
            <Link to="/ideas" hash="red-flags">
              <h3>Red flags</h3>
              <p>
                <b>{count(tally(large, "flags"))}</b> of them cross at least one flag line. See
                which line, and by how much.
              </p>
              <span className="arrow">
                See the flags <Arrow />
              </span>
            </Link>
          </li>
          <li>
            <Link to="/universe">
              <h3>The screener</h3>
              <p>
                All <b>{count(companies.length)}</b> companies with every measurement, sortable and
                filterable by verdict.
              </p>
              <span className="arrow">
                Open the screener <Arrow />
              </span>
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}

function Ratings({
  companies,
  bySymbol,
}: {
  companies: Company[];
  bySymbol: Map<string, Company>;
}) {
  const [added, setAdded] = useState<string[]>([]);
  const [numbers, setNumbers] = useState(false);
  const body = useRef<HTMLTableSectionElement>(null);
  const callout = useCallout();
  const symbols = [...added, ...FEATURED.filter((symbol) => !added.includes(symbol))];

  useEffect(() => {
    if (added.length > 0)
      body.current?.firstElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [added]);

  return (
    <section className="ratings" aria-labelledby="ratings-title" data-tour="ratings">
      <div className="chart-head">
        <div className="chart-title">
          <h2 id="ratings-title">The ratings</h2>
          <p>
            Eight familiar names. <span className="hint-mouse">Point at</span>
            <span className="hint-touch">Tap</span> any mark to see the number behind it.
          </p>
        </div>
        <Lookup
          companies={companies}
          onChoose={(symbol) =>
            setAdded((list) => [symbol, ...list.filter((item) => item !== symbol)].slice(0, 3))
          }
        />
        <button
          className="switch"
          type="button"
          aria-pressed={numbers}
          onClick={() => setNumbers((value) => !value)}
        >
          <span className="track" aria-hidden="true" />
          Show the numbers
        </button>
      </div>

      <table className={`chart${numbers ? " numbers" : ""}`}>
        <caption className="sr-only">
          Five-pillar ratings for selected IDX companies, Sectors data retrieved {longDate}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="co-h">
              <b>Company</b>
            </th>
            <th scope="col" className="cap">
              <b>Market cap</b>
            </th>
            {PILLARS.map((pillar, index) => (
              <th scope="col" className="p-h" key={pillar.id}>
                <b>
                  <span className="wide">{pillar.title}</span>
                  <span className="tiny">{shortTitles[index]}</span>
                </b>
                <small>{pillar.question}</small>
              </th>
            ))}
            <th scope="col" className="verdict-h">
              <b>Verdict</b>
            </th>
          </tr>
        </thead>
        <tbody ref={body} {...callout.handlers}>
          {symbols.map((symbol) => {
            const company = bySymbol.get(symbol);
            if (!company) return null;
            const isAdded = added.includes(symbol);
            return (
              <RatingRow
                key={`${symbol}-${isAdded ? "added" : "featured"}`}
                company={company}
                added={isAdded}
                delay={120 + (isAdded ? 0 : FEATURED.indexOf(symbol)) * 70}
                openPillar={callout.openFor(symbol)}
              />
            );
          })}
        </tbody>
      </table>

      <div className="guide">
        <div>
          <h3>Reading the marks</h3>
          <ul className="legend">
            {(["pass", "mixed", "fail", "unknown", "na"] as const).map((outcome) => (
              <li key={outcome}>
                <OutcomeMark outcome={outcome} />
                {outcomeLabels[outcome]}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>How a verdict is reached</h3>
          <p>
            Any flag makes it a red flag. Worth a look needs cash and the balance sheet to pass
            (returns and the balance sheet for banks), with at most one other pillar short of a
            pass. Missing numbers are skipped, never counted as zero.
          </p>
        </div>
        <div>
          <h3>Where the numbers come from</h3>
          <p>
            Sectors IDX data retrieved on {longDate}: FY2025 annual reports and current market data.
            Market caps in IDR.
          </p>
        </div>
      </div>
      {callout.render((symbol, pillar) => (
        <CalloutBody company={bySymbol.get(symbol)!} pillar={pillar} />
      ))}
    </section>
  );
}

function RatingRow({
  company,
  added,
  delay,
  openPillar,
}: {
  company: Company;
  added: boolean;
  delay: number;
  openPillar: number | null;
}) {
  const { verdict, pillars } = company.assessment;
  const stamp = { "--d": `${delay + 280}ms` } as CSSProperties;
  return (
    <tr className={added ? "added" : undefined}>
      <th scope="row">
        <div className="co">
          <Link to="/company/$ticker" params={{ ticker: company.symbol }}>
            {company.symbol}
          </Link>
          <span>{company.shortName}</span>
          <Stamp verdict={verdict} style={stamp} />
        </div>
      </th>
      <td className="cap">{formatMarketCap(company.marketCap)}</td>
      {pillars.map((result, index) => {
        const evidence = deciding(result.evidence);
        const measure = evidence && MEASURES[evidence.key];
        const said = evidence
          ? `${measure.label} ${formatReading(evidence.key, evidence.value)}`
          : result.outcome === "na"
            ? "not checked for this kind of company"
            : "no data";
        return (
          <td className="mk" key={result.id}>
            <button
              className="mark"
              type="button"
              data-symbol={company.symbol}
              data-pillar={index}
              aria-expanded={openPillar === index}
              aria-label={`${PILLARS[index].title}: ${outcomeLabels[result.outcome]}. ${said}`}
              style={
                { "--d": `${delay + index * 40}ms`, "--col": `${index * 30}ms` } as CSSProperties
              }
            >
              <OutcomeMark outcome={result.outcome} />
              <span className="reading">
                {evidence ? (
                  <>
                    <small className="wide">{measure.short}</small>
                    <small className="tiny">{measure.tiny}</small>
                    <b className={evidence.result === "fail" ? "f" : undefined}>
                      {formatReading(evidence.key, evidence.value)}
                    </b>
                  </>
                ) : (
                  <b className="q">{result.outcome === "na" ? "Not checked" : "No data"}</b>
                )}
              </span>
            </button>
          </td>
        );
      })}
      <td className="vd">
        <Stamp verdict={verdict} style={stamp} />
      </td>
    </tr>
  );
}

// Hover opens after a short delay, then instantly while moving between marks. Click or tap pins.
function useCallout() {
  const [tip, setTip] = useState<{
    symbol: string;
    pillar: number;
    open: boolean;
    instant: boolean;
  }>();
  const anchor = useRef<HTMLButtonElement | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  const closedAt = useRef(0);
  const timer = useRef(0);

  const show = (button: HTMLButtonElement, instant: boolean) => {
    clearTimeout(timer.current);
    anchor.current = button;
    setTip({
      symbol: button.dataset.symbol!,
      pillar: Number(button.dataset.pillar),
      open: true,
      instant,
    });
  };
  const hide = () => {
    clearTimeout(timer.current);
    if (!anchor.current) return;
    anchor.current = null;
    pinned.current = false;
    closedAt.current = performance.now();
    setTip((current) => current && { ...current, open: false, instant: false });
  };
  const warm = () => anchor.current !== null || performance.now() - closedAt.current < 300;
  const place = () => {
    const button = anchor.current;
    const element = box.current;
    if (!button || !element) return;
    const rect = button.getBoundingClientRect();
    const above = rect.top - element.offsetHeight - 10 > 8;
    const center = rect.left + rect.width / 2;
    const left = Math.max(
      8,
      Math.min(
        document.documentElement.clientWidth - element.offsetWidth - 8,
        center - element.offsetWidth / 2,
      ),
    );
    const top = above ? rect.top - element.offsetHeight - 8 : rect.bottom + 8;
    element.style.left = `${left + scrollX}px`;
    element.style.top = `${top + scrollY}px`;
    element.style.transformOrigin = `${center - left}px ${above ? "100%" : "0%"}`;
  };

  useLayoutEffect(() => {
    if (tip?.open) place();
  }, [tip]);

  useEffect(() => {
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Element;
      if (pinned.current && !target.closest(".mark, .callout")) hide();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      removeEventListener("resize", place);
      clearTimeout(timer.current);
    };
  }, []);

  const markOf = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLButtonElement>(".mark") : null;

  return {
    openFor: (symbol: string) => (tip?.open && tip.symbol === symbol ? tip.pillar : null),
    handlers: {
      onPointerOver(event: PointerEvent) {
        const button = markOf(event.target);
        if (!button || event.pointerType !== "mouse" || pinned.current || button === anchor.current)
          return;
        if (warm()) show(button, true);
        else {
          clearTimeout(timer.current);
          timer.current = window.setTimeout(() => show(button, false), 120);
        }
      },
      onPointerOut(event: PointerEvent) {
        const button = markOf(event.target);
        if (!button || event.pointerType !== "mouse" || pinned.current) return;
        if (markOf(event.relatedTarget)) return;
        hide();
      },
      onClick(event: MouseEvent) {
        const button = markOf(event.target);
        if (!button) return;
        if (anchor.current === button && pinned.current) return hide();
        show(button, anchor.current !== null);
        pinned.current = true;
      },
      onFocus(event: FocusEvent) {
        const button = markOf(event.target);
        if (button && !pinned.current) show(button, warm());
      },
      onBlur(event: FocusEvent) {
        if (!pinned.current && !markOf(event.relatedTarget)) hide();
      },
    },
    render: (content: (symbol: string, pillar: number) => ReactNode) =>
      createPortal(
        <div
          ref={box}
          className={`callout${tip?.open ? " open" : ""}${tip?.instant ? " instant" : ""}`}
          role="tooltip"
        >
          {tip && content(tip.symbol, tip.pillar)}
        </div>,
        document.body,
      ),
  };
}

function CalloutBody({ company, pillar }: { company: Company; pillar: number }) {
  const meta = PILLARS[pillar];
  const result = company.assessment.pillars[pillar];
  const { outcome } = result;
  return (
    <>
      <div className="callout-head">
        <b>
          {company.symbol} · {meta.title}
        </b>
        <span>{verdictLabels[company.assessment.verdict]}</span>
      </div>
      <p className="callout-q">{meta.question}</p>
      <div className="callout-verdict">
        <OutcomeMark outcome={outcome} />
        {outcome === "pass" || outcome === "mixed" || outcome === "fail"
          ? meta.headlines[outcome]
          : outcomeLabels[outcome]}
      </div>
      {result.evidence.length > 0 && (
        <ul>
          {result.evidence.map((evidence) => (
            <li key={evidence.key}>
              <OutcomeMark outcome={evidence.result} />
              <span className="lbl">{MEASURES[evidence.key].label}</span>
              <span className={evidence.result === "fail" ? "val f" : "val"}>
                {formatReading(evidence.key, evidence.value)}
              </span>
              <span className="lines">{ruleLines(evidence)}</span>
            </li>
          ))}
        </ul>
      )}
      {outcome === "na" && (
        <p className="gap">
          {meta.title} is not checked for{" "}
          {company.subSector === "Banks"
            ? "banks"
            : "insurance, financing and investment companies"}
          .
        </p>
      )}
      {outcome === "unknown" && (
        <p className="gap">Our data provider doesn’t have the figures for this check.</p>
      )}
    </>
  );
}

function Lookup({
  companies,
  onChoose,
}: {
  companies: Company[];
  onChoose: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const term = query.trim().toUpperCase();
  const options = term
    ? [
        ...companies.filter(({ symbol }) => symbol.startsWith(term)),
        ...companies.filter(
          ({ symbol, shortName }) =>
            !symbol.startsWith(term) && shortName.toUpperCase().includes(term),
        ),
      ].slice(0, 6)
    : [];
  const expanded = open && term !== "";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || isEditable(event.target)) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const choose = (symbol: string) => {
    setQuery("");
    setOpen(false);
    onChoose(symbol);
  };
  const move = (step: number) =>
    options.length && setActive((index) => (index + step + options.length) % options.length);

  return (
    <div className="lookup">
      <label className="sr-only" htmlFor="lookup">
        Rate any IDX company
      </label>
      <div className="lookup-field">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          ref={input}
          id="lookup"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="Rate any ticker, e.g. BREN"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls="lookup-options"
          aria-activedescendant={
            expanded && options[active] ? `lookup-${options[active].symbol}` : undefined
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              move(event.key === "ArrowDown" ? 1 : -1);
            } else if (event.key === "Enter" && expanded && options[active]) {
              event.preventDefault();
              choose(options[active].symbol);
            } else if (event.key === "Escape") setOpen(false);
          }}
          onBlur={() => setOpen(false)}
        />
        <kbd aria-hidden="true">/</kbd>
      </div>
      <ul
        className="suggest"
        id="lookup-options"
        role="listbox"
        aria-label="Matching companies"
        hidden={!expanded}
      >
        {options.map((company, index) => (
          <li
            role="option"
            id={`lookup-${company.symbol}`}
            aria-selected={index === active}
            key={company.symbol}
            onPointerDown={(event) => {
              event.preventDefault();
              choose(company.symbol);
            }}
          >
            <b>{company.symbol}</b>
            <span>{company.shortName}</span>
            <em className={company.assessment.verdict}>
              {verdictLabels[company.assessment.verdict]}
            </em>
          </li>
        ))}
        {options.length === 0 && (
          <li className="none" role="option" aria-selected={false} aria-disabled="true">
            No IDX ticker or name matches “{query.trim()}”.
          </li>
        )}
      </ul>
    </div>
  );
}

type RulerSpec = (typeof RULERS)[number];

function Ruler({ ruler, bySymbol }: { ruler: RulerSpec; bySymbol: Map<string, Company> }) {
  const pillar = PILLARS[ruler.pillar];
  const rule = pillar.rules.nonFinancial.find(({ key }) => key === ruler.key)!;
  const [pass, fail] = [rule.pass!, rule.fail!];
  const lowerIsBetter = pass[0].startsWith("<");
  const at = (value: number) =>
    ((Math.max(ruler.min, Math.min(ruler.max, value)) - ruler.min) / (ruler.max - ruler.min)) * 100;
  const zone = (from: number, to: number): CSSProperties => ({
    left: `${at(from)}%`,
    width: `${at(to) - at(from)}%`,
  });
  const pins = ruler.pins.flatMap((symbol) => {
    const evidence = bySymbol
      .get(symbol)
      ?.assessment.pillars[ruler.pillar].evidence.find(({ key }) => key === ruler.key);
    return evidence ? [{ symbol, ...evidence }] : [];
  });
  const described = `${ruler.metric}: passes ${phrase(pass, ruler.key)}, flagged ${phrase(fail, ruler.key)}. ${pins
    .map(({ symbol, value }) => `${symbol} ${formatReading(ruler.key, value)}`)
    .join(", ")}.`;
  return (
    <article className="check">
      <div className="check-q">
        <h3>{pillar.question}</h3>
        <p>
          <b>{pillar.title}</b> · {ruler.scope}
        </p>
      </div>
      <div className="check-r">
        <div className="metric">
          <b>{ruler.metric}</b>
          <span>{ruler.period}</span>
        </div>
        <div className="ruler" role="img" aria-label={described}>
          <div className="track" />
          <div
            className="zone pass"
            style={lowerIsBetter ? zone(ruler.min, pass[1]) : zone(pass[1], ruler.max)}
          />
          <div
            className="zone flag"
            style={lowerIsBetter ? zone(fail[1], ruler.max) : zone(ruler.min, fail[1])}
          />
          <div className="line pass" style={{ left: `${at(pass[1])}%` }} />
          <div className="line flag" style={{ left: `${at(fail[1])}%` }} />
          <span
            className={`line-label pass ${lowerIsBetter ? "toward-lo" : "toward-hi"}`}
            style={{ left: `${at(pass[1])}%` }}
          >
            Pass line {formatLine(ruler.key, pass[1])}
          </span>
          <span
            className={`line-label flag ${lowerIsBetter ? "toward-hi" : "toward-lo"}`}
            style={{ left: `${at(fail[1])}%` }}
          >
            Flag line {formatLine(ruler.key, fail[1])}
          </span>
          <span className="end lo">{formatLine(ruler.key, ruler.min)}</span>
          <span className="end hi">{formatLine(ruler.key, ruler.max)}</span>
          {pins.map(({ symbol, value, result }) => (
            <div
              key={symbol}
              className={`pin${at(value) < 10 ? " lo" : at(value) > 90 ? " hi" : ""}`}
              style={{ left: `${at(value)}%` }}
            >
              <span className="tag">
                <b>{symbol}</b>
                {formatReading(ruler.key, value)}
              </span>
              <span className="stem" />
              <OutcomeMark outcome={result} />
            </div>
          ))}
        </div>
        <p className="rule-text">
          Passes {phrase(pass, ruler.key)}. Flagged {phrase(fail, ruler.key)}.{" "}
          <b>{ruler.note[0]}</b>
          {ruler.note[1] && (ruler.note[1].startsWith(",") ? ruler.note[1] : ` ${ruler.note[1]}`)}
        </p>
      </div>
    </article>
  );
}

type CheckEvidence = NonNullable<FunctionReturnType<typeof api.universe.check>>;

function Trace({ company, check }: { company: Company; check: CheckEvidence & { value: number } }) {
  const result = company.assessment.pillars[0];
  const pillar = PILLARS[0];
  const rule = pillar.rules.nonFinancial.find(({ key }) => key === check.checkId)!;
  const bn = (value: number | null) =>
    value === null ? "No data" : Math.round(value / 1e9).toLocaleString("en-US");
  const sums = (
    [
      ["operatingCashFlow", "Operating cash flow"],
      ["earnings", "Earnings"],
    ] as const
  ).map(([key, label]) => {
    const inputs = check.inputs.filter((input) => input.key === key);
    return { label, inputs, total: inputs.reduce((sum, input) => sum + (input.value ?? 0), 0) };
  });
  const first = check.inputs[0];
  const periods = [...new Set(check.inputs.map(({ period }) => period))];
  const outcome = result.outcome;
  return (
    <ol className="steps">
      <li className="step">
        <span className="step-k">Verdict</span>
        <div className="step-v">
          <span className="big">{company.symbol}</span>
          <Stamp verdict={company.assessment.verdict} />
          <small>
            {company.shortName} · {formatMarketCap(company.marketCap)}
          </small>
        </div>
      </li>
      <li className="step">
        <span className="step-k">Pillar</span>
        <div className="step-v pillar-step">
          <OutcomeMark outcome={outcome} />
          <span>
            <b>{pillar.title}.</b> {pillar.question}{" "}
            {outcome === "pass" || outcome === "mixed" || outcome === "fail"
              ? `${pillar.headlines[outcome]}.`
              : outcomeLabels[outcome]}
          </span>
        </div>
      </li>
      <li className="step">
        <span className="step-k">Measurement</span>
        <div className="step-v">
          <span className="big">{formatReading(check.checkId, check.value)}</span>
          <span>cash conversion, {humanPeriod(check.period)}</span>
          <small>{ruleLines(rule)}</small>
        </div>
      </li>
      <li className="step">
        <span className="step-k">Figures, IDR bn</span>
        <div className="step-v">
          <div className="sum-wrap">
            <div className="sum">
              {sums.map(({ label, inputs, total }, index) => (
                <Fragment key={label}>
                  {index > 0 && <hr />}
                  <span className="lbl">{label}</span>
                  <span className="terms">{inputs.map(({ value }) => bn(value)).join(" + ")}</span>
                  <span className="tot">{bn(total)}</span>
                </Fragment>
              ))}
            </div>
            <span className="eq">= {formatReading(check.checkId, check.value)}</span>
          </div>
        </div>
      </li>
      <li className="step">
        <span className="step-k">Source</span>
        <div className="step-v">
          <span className="source-line">
            {sourceLine(first.source?.retrievedAt ?? manifest.retrievedAt)}
          </span>
          <small>
            {company.symbol}’s figures for {periods.slice(0, -1).join(", ")} and {periods.at(-1)}
          </small>
        </div>
      </li>
    </ol>
  );
}
