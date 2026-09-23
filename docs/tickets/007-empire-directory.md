# Conglomerate ticker universe and second Empire

Status: planned after the first-Empire exit check in [the ticket sequence](README.md).

## Outcome

A researcher can inspect the provider-backed conglomerate ticker universe, filter measured signals by either of two imported conglomerates, and open the same context views for both.

Start this ticket only after the Prajogo journey includes fundamental, broker, and market measurements, sourced Empire context, and the first-Empire news empty state or exact matches. Import one second Empire to test reuse. Do not turn this ticket into a full-universe daily market or broker collection job.

## User path

1. Open the Empire directory.
2. Inspect each conglomerate's listed tickers, source, retrieval date, and coverage state.
3. Open **What's happening?** and select an Empire filter.
4. Open a signal from either Empire.
5. Continue to its company and Empire context.

## Vertical slice

- Add a normalized registry keyed by provider affiliate label and ticker.
- Seed each listed-company universe with an exact Sectors `affiliates` query.
- Store the query, retrieval time, returned ticker set, and source field in the Empire manifest.
- Keep provider group membership separate from legal ownership.
- Add `/empires` for ticker-universe, manifest, source, and coverage inspection.
- Add an Empire filter sourced from the registry and imported manifests.
- Replace Prajogo-only sync constants with a validated discovery definition.
- Generate and validate a second corpus through the same boundary.
- Import both corpora idempotently.
- Reuse signal, company, and Empire routes without slug or ticker branches.

## Acceptance criteria

- **What's happening?** filters signals by stored Empire membership.
- Every researched ticker belongs to at least one sourced registry entry.
- Duplicate membership across conglomerates does not duplicate the company identity or its price collection.
- A registry entry records its provider, retrieval date, and coverage state.
- Every listed membership traces to an imported affiliate response or a separately cited company-report group label.
- Removing a ticker from the latest affiliate result creates a reviewable coverage change. It does not silently delete historical membership evidence.
- Both Empires use the same signal queries and React features.
- Group-specific requests stay inside discovery definitions.
- Each Empire displays its discovery limits and gaps.
- Shared files contain no `prajogo` check.
- The app does not merge entities by display name or ticker.

## Non-goals

- Completing every private-company ownership graph before listed-ticker coverage begins
- Equal provider coverage across Empires
- Global legal-entity resolution

## Verification

- Test discovery definitions, idempotent import, and Empire filters.
- Run both corpus validators.
- Browser-test one signal and company from each Empire.
- Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.
