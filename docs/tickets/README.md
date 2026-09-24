# Product tickets

Current work stays within the checked-in Prajogo Pangestu Empire. Each slice starts with provider data and ends in a reachable interface with sources and gaps. Shared rules and views remain Empire-agnostic, but importing another Empire is deferred while Sectors credits are limited.

## Sequence

| Order | Slice | Priority | Status | Depends on |
| --- | --- | --- | --- | --- |
| 1 | [Signal workspace](001-signal-workspace.md) | P0 | Implemented for fundamentals | Current company facts |
| 2 | [Fundamental signals](002-fundamental-signals.md) | P0 | Implemented for current corpus | Signal workspace |
| 3 | [Broker flow signals](003-broker-signals.md) | P0 | Implemented for stored observations; 60-session baseline needs more data | Signal workspace and flow collector |
| 4 | [Market signals](004-market-signals.md) | P0 | Implemented for recent stored dates | Signal workspace and market collector |
| 5 | [Company news](005-company-news.md) | P1 | Implemented for September 2026 IDX news | Stable entity identity |
| 6 | [Empire context](006-empire-context.md) | P0 | Implemented for Prajogo | Signal and company navigation |
| 7 | [Empire directory and second Empire](007-empire-directory.md) | P1 | Deferred; owned by another agent | Reusable signal and Empire contracts |
| 8 | [Research cases](008-research-cases.md) | P2 | Deferred | Authentication and stable record references |

## First-Empire exit check

Tickets 1 through 6 form the first release, using the Prajogo corpus rather than one showcase ticker. Before starting ticket 7, a researcher must be able to:

1. Open **What's happening?**, choose a date range, and find a fundamental, broker, or market measurement for any eligible listed company.
2. Open each measurement's inputs, formula, period, coverage, and provider source. Missing data must appear as a gap.
3. Open the company and compare its available fundamental, broker, and market records without an app-generated interpretation.
4. Open the company's Empire context and inspect the evidence for its relationships.
5. See linked news when the provider has an exact entity match, or see an explicit empty state.

Verify this path in the browser with more than one listed company. A link that lands on a placeholder does not pass. Ticket 7 remains deferred. Ticket 8 adds private user notes after authentication exists.

## Credit boundary

The first release collects broker and market observations only for the listed companies in the first Empire, starting September 2026. One [daily-market request](https://docs.sectors.app/api-references/v2/indonesia/transaction/daily) and one [broker-summary request](https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-summary-by-symbol) per ticker cost two credits when neither response is cached. Broker collection uses only days 1–14 and 15–28 of each month; days 29–31 are skipped. Covering both broker windows and one market window costs 3 credits per ticker, or 30 credits for the 10 Prajogo tickers. A 60-trading-day broker baseline remains out of scope.

Every collection run shows its ticker set, window, and worst-case credit cost before it calls Sectors; the client enforces the explicit `--max-credits` cap, which defaults to zero. The completion report shows cache hits and actual credits. Do not start a full-universe or multi-Empire daily refresh during the first release. A 60-session broker backfill remains an explicit, budgeted operator run, not a prerequisite for displaying the current coverage gap.

The Prajogo mining asset map remains a separate, deferred vertical slice. It does not require a second Empire.

## Rules

- Read [`system-design.md`](../system-design.md) before changing a data contract.
- Read [`product-design-system.md`](../product-design-system.md) before changing a route.
- Keep every ticket vertical.
- Start user journeys from a measured signal or news record, not from a graph.
- Do not name a ticker in shared UI or rule logic.
- Display facts, calculations, and gaps. Do not generate conclusions.
- Make every measured signal reproducible from displayed inputs.
- Split a ticket only when each resulting ticket still ends in a usable journey.
- Update this index when scope or sequence changes.
