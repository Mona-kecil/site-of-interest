# Company news

Status: implemented for Sectors IDX news published from 2026-09-01 through 2026-09-23. Four pages returned 97 records for the 10 listed Prajogo tickers and cost four credits. The import does not cover earlier news or non-IDX mining news.

## Outcome

A researcher scans provider news beside measured signals and verifies why each item links to an entity.

## User path

1. Open **What's happening?** and select the news record type.
2. Filter by Empire, entity, or publication period.
3. Open a news record.
4. Inspect its source and exact entity-match rule.
5. Continue to the company or Empire context.

## Vertical slice

- Inspect the Sectors news response before defining the record.
- Normalize the provider item ID, headline, source, publication time, stated event time, URL metadata, and source reference.
- Match only by provider ID, ticker, legal name, or registered exact alias.
- Store ambiguous and unmatched names as gaps for human review.
- Store news separately from corporate actions.
- Add paginated news summaries to **What's happening?** and bounded timelines to company views.

## Acceptance criteria

- Every item resolves to one provider record.
- Every entity link displays the exact match rule.
- An ambiguous name never creates an entity link.
- Publication time and stated event time remain separate.
- The UI generates no sentiment, topic, impact, summary, or causal label.
- An entity with no matched news displays an empty state and coverage date.

## Non-goals

- External news providers
- Semantic matching
- Article summarization
- Predicted impact

## Verification

- Add parser fixtures for every stored field.
- Test exact aliases, ambiguous names, unmatched names, and ordering.
- Browser-test the feed, a news detail, and an empty company timeline.
- Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.

## Current implementation

`scripts/sync-news.mjs` requests a bounded four-page window. `src/news-records.mjs` validates the response and keeps only exact matches from the provider's `symbols` field. The feed displays publication time, headline, source URL, matched tickers, and the match rule. Company pages show matched items and the searched date range. The importer omits the provider's sentiment tags, body text, and dimension scores.

The response does not include an article ID or separate event time. The app derives a stable key from the article URL, publication timestamp, and headline, and it does not invent an event time. A future broader news history requires its own bounded collection plan.
