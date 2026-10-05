import type { Outcome } from "./ideas-model";

// Harvey balls on a 24px grid. The fill is its own element so a chart can animate it in.
export function OutcomeMark({ outcome }: { outcome: Outcome | "neutral" }) {
  switch (outcome) {
    case "pass":
      return (
        <svg className="outcome-mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--ink)" strokeWidth="2" />
          <circle className="mark-fill" cx="12" cy="12" r="10" fill="var(--ink)" />
        </svg>
      );
    case "mixed":
    case "neutral":
      return (
        <svg className="outcome-mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />
          <path className="mark-fill" d="M12 2a10 10 0 0 1 0 20z" fill="var(--ink)" />
        </svg>
      );
    case "fail":
      return (
        <svg className="outcome-mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--red)" strokeWidth="2" />
          <g className="mark-fill">
            <circle cx="12" cy="12" r="11" fill="var(--red)" />
            <path
              d="m8 8 8 8m0-8-8 8"
              stroke="var(--white)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        </svg>
      );
    case "unknown":
      return (
        <svg className="outcome-mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth="1.6"
            strokeDasharray="2.4 3"
          />
        </svg>
      );
    case "na":
      return (
        <svg className="outcome-mark" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.5 12h9" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}
