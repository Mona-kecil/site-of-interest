# Fundamental signals

Status: implemented for the checked-in Prajogo corpus. The feed stores 350 rule results across 10 listed companies. Rules that need an undefined peer set or unavailable inputs remain out of scope.

## Outcome

A researcher compares fundamental measurements across listed companies without receiving a valuation or quality judgment.

## User path

1. Filter **What's happening?** to fundamental signals.
2. Select a reporting period and metric.
3. Compare companies with the same unit and period.
4. Open a measurement's formula and provider facts.
5. Continue to the company record.

## Vertical slice

- Define sector templates that list valid measurements.
- Read financial and valuation facts through bounded Convex queries.
- Add versioned rules for period changes, cash conversion, leverage, return metrics, and valuation ratios when inputs exist.
- Keep peer sets and reporting periods explicit.
- Show every formula, input, unit, period, source, and gap.
- Sort only values that share a definition, unit, and period.

## Acceptance criteria

- Every displayed value resolves to provider facts and a formula version.
- Missing values appear as gaps rather than zero.
- Sector templates block invalid comparisons.
- The UI does not label a company or metric as cheap, expensive, strong, weak, improving, or deteriorating.
- No composite company score exists.
- A selected signal opens the correct company and Empire context.

## Non-goals

- Price targets or fair values
- AI-selected peers
- Market or broker measurements

## Verification

- Test sector eligibility, units, periods, formulas, sorting, and gaps.
- Browser-test a cross-company comparison and calculation detail.
- Run `npm run check`, `npm test`, `npm run test:e2e`, `npm run build`, and `npm run validate`.

## Current implementation

`src/features/today/fundamental-rules.ts` defines the sector templates and versioned calculations. `convex/seed.ts` runs them over the checked-in facts. `convex/fundamentalSignals.ts` provides the paginated feed, exact metric and period comparisons, company measurements, and source detail. The UI shows gaps for missing inputs and lets the researcher open the company inside the same Empire.

The imported reports do not define a named peer set, book value, EBITDA, or dividend inputs for these calculations. Do not derive a peer ranking or those ratios from unrelated fields. Add each rule when its provider-backed inputs and comparison set exist.
