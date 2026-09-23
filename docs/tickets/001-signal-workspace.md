# Signal workspace

Status: implemented for fundamental measurements. Broker, market, and news tabs state that those records are not collected in this slice.

## Outcome

A researcher opens **What's happening?**, chooses a time frame, sees reproducible measurements across eligible listed companies, and follows one measurement to its company and source records.

## User path

1. Open `/happening`.
2. Sort or filter measured signals.
3. Open a signal to inspect its value, baseline, formula, period, coverage, and sources.
4. Open the subject company.

## Vertical slice

- Add `/happening` as the default route, with Today, Yesterday, and custom date-range controls.
- Use a stable split layout with the record list on the left and a persistent detail inspector on the right.
- Pin the selected record above an All, Fundamental, Market, and Broker lens control in the inspector.
- Define the stored measured-signal contract and a TypeScript rule registry.
- Use one numeric calculation supported by the current company facts as the first rule.
- Apply the rule to every eligible company. Do not select a demonstration ticker.
- Store exact input references, formula version, value, unit, period, and coverage.
- Add paginated Convex queries for signal summaries and signal detail.
- Replace interpretive company signal labels with measured values where the first rule overlaps them.

## Acceptance criteria

- The same rule runs for every company with the required inputs.
- Missing inputs produce a gap rather than a value.
- The feed displays no qualitative conclusion.
- Signal detail contains enough data to reproduce the value.
- The same inputs and rule version produce the same signal identity and value.
- Company navigation preserves the Empire slug.

## Non-goals

- Empire graph redesign
- Broker or market collection
- News
- Personalized ranking

## Verification

- Test eligible, missing-input, and repeat-execution cases.
- Test pagination, sorting, filters, and company navigation.
- Browser-test the path from `/happening` to signal detail and company evidence across preset and custom date ranges.
- Run `npm run check`, `npm test`, `npm run test:e2e`, `npm run build`, and `npm run validate`.
