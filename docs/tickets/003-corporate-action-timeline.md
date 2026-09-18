## Outcome

A researcher can see dated corporate actions and company events beside the financial record they may affect.

## User path

1. Open a company-intelligence page.
2. Scan a chronological event timeline.
3. Filter by corporate action, ownership, contract, or operational event.
4. Open the evidence record for an event.

## Vertical slice

- Probe the relevant Sectors corporate-action and news responses before fixing the record shape.
- Normalize events with a stable ID, ticker, event kind, announced date, effective date when returned, status, summary, involved entities, and source references.
- Keep provider text separate from system interpretation.
- Store events in their own Convex table indexed by ticker and date.
- Add the event timeline to `/company/$ticker` without hiding the financial and valuation sections.
- Mark a date as unknown when Sectors does not return one.

## Acceptance criteria

- The timeline contains only events returned by Sectors.
- Each event shows whether its date is announced, effective, or unknown.
- Corporate actions are visually distinct from ordinary news without relying on color alone.
- Ownership changes identify the entities returned by Sectors.
- The interface makes no causal claim between an event and a price move unless Sectors provides that claim.
- Authenticated endpoints appear as non-clickable evidence references.
- The route handles a company with no returned events.

## Non-goals

- Sentiment analysis.
- Outside news sources.
- Predicted event impact.
- Automatic alerts.

## Verification

- Add parser fixtures for every returned event variant used by the UI.
- Unit-test chronological ordering and missing dates.
- Browser-test a populated timeline and an empty state.
- Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.

