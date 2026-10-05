import { formatValue, gapCategory, humanGap } from "../../universe/presentation.mjs";
import { formatReading, MEASURES, outcomeLabels } from "../ideas/evidence";
import { PILLARS } from "../ideas/ideas-model";
import { OutcomeMark } from "../ideas/OutcomeMark";
import { HISTORY_YEARS, pillarRecords, type PillarRecord, type Reading } from "./history-model";
import type { CompanyProfile } from "./profile-model";

const freeCashFlow = { label: "Free cash flow (bn)", tiny: "FCF (bn)" };
const signed = new Intl.NumberFormat("en", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const perShare = new Intl.NumberFormat("en", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function tally({ years }: PillarRecord) {
  const rated = years.filter(({ outcome }) => outcome !== "unknown").length;
  const passed = years.filter(({ outcome }) => outcome === "pass").length;
  if (rated === 0) return "No year could be rated";
  if (rated === years.length) return `Passed in ${passed} of ${rated} years`;
  return `Passed in ${passed} of ${rated} rated ${rated === 1 ? "year" : "years"}`;
}

function ReadingCell({ reading }: { reading: Reading }) {
  if (reading.value === null)
    return (
      <td data-reported="false" title={humanGap(reading.gap ?? "")}>
        {gapCategory(reading.gap)}
      </td>
    );
  return (
    <td data-result={reading.result}>
      {reading.key === "free_cash_flow"
        ? Math.round(reading.value / 1e9).toLocaleString("en-US")
        : formatReading(reading.key, reading.value)}
    </td>
  );
}

function YearTable({ records }: { records: PillarRecord[] }) {
  return (
    <div className="record-wrap" tabIndex={0} role="region" aria-label="Pillar record by year">
      <table className="record">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Pillar and measure</span>
            </th>
            {HISTORY_YEARS.map((year) => (
              <th key={year} scope="col">
                <span className="record-fy">FY</span>
                {year}
              </th>
            ))}
          </tr>
        </thead>
        {records.map((record) => (
          <tbody key={record.id}>
            <tr className="record-pillar">
              <th scope="row">
                {PILLARS.find(({ id }) => id === record.id)!.title}
                <small>{tally(record)}</small>
              </th>
              {record.years.map(({ year, outcome }) => (
                <td key={year}>
                  <OutcomeMark outcome={outcome} />
                  <span className="sr-only">{outcomeLabels[outcome]}</span>
                </td>
              ))}
            </tr>
            {record.rules.map((rule, index) => {
              const measure = MEASURES[rule.key] ?? freeCashFlow;
              return (
                <tr key={rule.key}>
                  <th scope="row">
                    <span className="wide">{measure.label}</span>
                    <span className="tiny">{measure.tiny}</span>
                  </th>
                  {record.years.map((mark) => (
                    <ReadingCell key={mark.year} reading={mark.readings[index]} />
                  ))}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function change(estimate: number, growth: number | null | undefined) {
  if (growth == null) return null;
  return estimate > 0 && estimate / (1 + growth) > 0
    ? `${signed.format(growth)} on FY2025`
    : "No growth figure across a loss";
}

function Estimates({ profile }: { profile: CompanyProfile }) {
  const { current, symbol } = profile.company;
  const { revenueEstimate2026: revenue, epsEstimate2026: eps, forwardPe, peTtm } = current;
  const figures = [
    revenue != null && {
      label: "Revenue, FY2026 estimate",
      value: `IDR ${Math.round(revenue / 1e9).toLocaleString("en-US")} bn`,
      note: change(revenue, current.revenueGrowth2026),
    },
    eps != null && {
      label: "EPS, FY2026 estimate",
      value: `IDR ${perShare.format(eps)}`,
      note: change(eps, current.epsGrowth2026),
    },
    forwardPe != null && {
      label: "Forward P/E",
      value: forwardPe > 0 ? formatValue(forwardPe, "multiple") : "Not meaningful",
      note:
        forwardPe <= 0
          ? "Analysts expect a loss"
          : peTtm != null && peTtm > 0
            ? `${formatValue(peTtm, "multiple")} trailing today`
            : null,
    },
  ].filter((figure) => figure !== false);
  if (!figures.length)
    return <p className="estimates-none">Sectors reports no analyst estimates for {symbol}.</p>;
  return (
    <dl className="estimates">
      {figures.map(({ label, value, note }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd data-reported={value !== "Not meaningful"}>{value}</dd>
          {note && <dd>{note}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function TrackRecord({ profile }: { profile: CompanyProfile }) {
  const records = pillarRecords(profile.company, profile.years).filter(
    ({ rules }) => rules.length > 0,
  );
  return (
    <section
      className="profile-section"
      aria-labelledby="profile-over-time-title"
      data-tour="track-record"
    >
      <h2 id="profile-over-time-title">Track record and forecasts</h2>
      <div className="over-time-grid">
        <div>
          <h3>Our rules, year by year</h3>
          <p>
            Each year’s reports are held to today’s pass and flag lines. Price and owners are rated
            for today only. Past share prices aren’t in the record, and the owner checks already
            cover 2020 to 2025.
          </p>
          <YearTable records={records} />
          <ul className="record-legend" aria-label="Mark key">
            {(["pass", "mixed", "fail", "unknown"] as const).map((outcome) => (
              <li key={outcome}>
                <OutcomeMark outcome={outcome} />
                {outcomeLabels[outcome]}
              </li>
            ))}
          </ul>
        </div>
        <div className="over-time-next">
          <h3>What analysts expect</h3>
          <p>
            Figures from Sectors’ analyst coverage, not our rules. They play no part in the rating.
          </p>
          <Estimates profile={profile} />
        </div>
      </div>
    </section>
  );
}
