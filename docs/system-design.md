# System design

This document defines how Site of Interest features fit together. Read it before changing a data contract, adding a route, or writing a product ticket.

## Product boundary

Site of Interest helps a researcher decide which part of an Indonesian conglomerate deserves attention. It does not recommend trades.

The application accepts market intelligence only from the Sectors API. A static geographic boundary file may provide map geometry, but it cannot supply company, ownership, asset, production, or market facts.

Every claim shown to a user must be one of these states:

- **Fact**: a normalized value returned by Sectors.
- **Inference**: a conclusion derived only from cited Sectors facts. The interface states the derivation and confidence.
- **Gap**: a question that the available Sectors response does not answer.

Never convert a gap into a fact. Never present group membership as legal ownership.

## Runtime shape

```text
Sectors API
    ↓ boundary parser
Normalized domain records
    ↓ idempotent import or on-demand write
Convex tables
    ↓ route-specific query
React feature
    ↓ user action
Evidence reference or next research action
```

The boundary parser owns wire-format checks. Convex stores normalized records. React renders a read model and owns temporary interaction state. A component does not parse Sectors responses or query storage tables directly.

## Data lifecycles

Use the lifecycle that matches the data.

### Corpus snapshots

Empire relationships, company profiles, source records, and research coverage form a validated snapshot. `scripts/sync-sectors.mjs` builds the snapshot. `convex/seed.ts` imports it idempotently.

Snapshot refreshes are explicit because a cold Prajogo sync spends Sectors credits. Checked-in JSON keeps a demo reproducible.

### On-demand observations

Price, volume, and broker rows arrive in bounded windows. Fetch the latest window when a user opens the matching view, persist each trading day, and serve stored history on later visits.

One page visit may spend at most one Sectors credit. Concurrent requests for the same ticker and window share one operation.

### User state

Saved research cases, notes, and watch conditions are user-owned records. Keep them separate from provider facts. A user note cannot become evidence for an Empire edge or company metric.

## Domain ownership

| Domain | Owns | Does not own |
| --- | --- | --- |
| Empire | Entities, relationships, assertions, graph filters | Company financial calculations |
| Company | Profile metrics, annual financials, valuation periods, derived signals | Broker-role classification |
| Events | Corporate actions, dated company events, event evidence | Causal claims not returned by Sectors |
| Flow | Ticker-day market data and independent broker rows | Permanent broker labels across tickers |
| Assets | Operating sites, location coverage, production, capacity, and stated limits | Map geometry as intelligence evidence |
| Research | Saved focus, notes, and watch conditions | Provider facts or system inferences |

High-churn domains use separate Convex tables from stable company profiles. Do not append broker observations or user notes to a company document.

## Stable identity

Use stable domain keys at integration boundaries:

- Empire: `empireSlug`
- Entity: `empireSlug + entityId`
- Listed company: `empireSlug + ticker`
- Market observation: `ticker + tradingDate`
- Broker observation: `brokerCode + ticker + tradingDate`
- Source: `empireSlug + sourceId`

Convex `_id` values stay inside Convex functions. Browser routes and imported corpora use stable domain keys.

## Evidence access

Sectors API URLs require credentials. Never render them as browser links.

The interface shows:

- the source title;
- the API path without credentials;
- `Authenticated API` as the access mode;
- the retrieval date; and
- the field locator when a specific claim needs it.

The browser never receives `SECTORS_API_KEY`.

## Feature structure

Each product route owns one feature directory and one Convex read model:

```text
convex/<domain>.ts
src/features/<domain>/<DomainPage>.tsx
src/features/<domain>/<domain>-model.ts
src/features/<domain>/<domain>-model.test.ts
e2e/<journey>.spec.ts
```

Keep calculation rules in pure model functions. Keep JSX focused on presentation and interaction. Derive client types from Convex function return types when the generated API already describes the shape.

## Vertical delivery contract

A feature ticket is complete only when one user journey works through the full stack. The slice includes:

1. a Sectors input or an existing normalized input;
2. a validated domain record;
3. indexed Convex storage when persistence is required;
4. a route-specific Convex read model;
5. a reachable React route;
6. visible evidence and gaps;
7. a browser test of the main journey; and
8. type checks, unit tests, and a production build.

Do not create separate “backend”, “frontend”, or “database” tickets for one feature. Those are tasks inside the vertical ticket.

## Design constraints

- Bound every Convex query with an index and a limit or pagination.
- Make imports and collectors safe to rerun.
- Store facts before interpretations.
- Keep each broker independent for each ticker.
- Label calculations as analysis, not provider facts.
- Show incomplete coverage. Do not manufacture completeness.
- Prefer one deep route over several placeholder routes.

