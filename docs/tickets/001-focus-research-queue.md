## Outcome

A researcher can compare every listed company in one Empire and choose the next company to inspect.

## User path

1. Open **Focus** from the main navigation.
2. Compare the listed companies by delivery, valuation, cash flow, and research coverage.
3. Sort or filter the queue.
4. Open a company-intelligence page from any row.

## Vertical slice

- Add `/focus/$empireSlug` and enable the **Focus** navigation item.
- Add one bounded Convex query that returns the listed companies and the existing normalized facts needed by the board.
- Reuse the company cycle model. Do not create a second valuation classifier.
- Show latest P/E, peer P/E, peer premium, quarterly revenue growth, quarterly earnings growth, latest free cash flow, cycle state, and coverage status.
- Explain the active sort in plain text.
- Show data gaps beside the affected company.

## Acceptance criteria

- The board includes every non-boundary listed company in the selected Empire.
- Every displayed value resolves to an existing company fact.
- The default order is a research-priority order, not a return forecast.
- The interface explains why the first row appears first.
- A user can filter by cycle state and incomplete coverage.
- Selecting a row opens `/company/$ticker`.
- The table remains usable at 390px without document-level horizontal overflow.
- No Sectors request runs when the page opens. This slice uses the existing corpus.

## Non-goals

- Buy or sell scores.
- Price targets.
- Broker-flow signals.
- User-saved watchlists.

## Verification

- Unit-test ordering and filtering as pure functions.
- Browser-test the default order, one filter, and company navigation.
- Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.

