# Product tickets

Current work stays within the checked-in Prajogo Pangestu Empire. Each slice starts with provider data and ends in a reachable interface with sources and gaps. Shared rules and views remain Empire-agnostic, but importing another Empire is deferred while Sectors credits are limited.

## Sequence

| Order | Slice | Priority | Status | Depends on |
| --- | --- | --- | --- | --- |
| 1 | [Signal workspace](001-signal-workspace.md) | P0 | Implemented for fundamentals | Current company facts |
| 2 | [Fundamental signals](002-fundamental-signals.md) | P0 | Implemented for current corpus | Signal workspace |
| 5 | [Company news](005-company-news.md) | P1 | Implemented for September 2026 IDX news | Stable entity identity |
| 6 | [Empire context](006-empire-context.md) | P0 | Implemented for Prajogo | Signal and company navigation |
| 7 | [Empire directory and second Empire](007-empire-directory.md) | P1 | Deferred; owned by another agent | Reusable signal and Empire contracts |
| 8 | [Research cases](008-research-cases.md) | P2 | Deferred | Authentication and stable record references |

## First-Empire exit check

Tickets 1, 2, 5, and 6 form the first release, using the Prajogo corpus rather than one showcase ticker. Before starting ticket 7, a researcher must be able to:

1. Open **What's happening?**, choose a date range, and find a fundamental measurement or matched news record for any eligible listed company.
2. Open each measurement's inputs, formula, period, coverage, and provider source. Missing data must appear as a gap.
3. Open the company and compare its available fundamental records and sourced news without an app-generated interpretation.
4. Open the company's Empire context and inspect the evidence for its relationships.
5. See linked news when the provider has an exact entity match, or see an explicit empty state.

Verify this path in the browser with more than one listed company. A link that lands on a placeholder does not pass. Ticket 7 remains deferred. Ticket 8 adds private user notes after authentication exists.

## Credit boundary

The first release uses stored company fundamentals, ownership records, and exact ticker news matches for the first Empire. Corpus and news syncs share a cached Sectors client. Opening the feed, a company, Focus, or Empire context makes no provider request.

A cold corpus sync spends Sectors credits. News collection reads the ticker set from stored memberships and fetches at most four pages for its configured window. Both scripts report remote calls, cache hits, and credits. Estimate the required requests before an explicit refresh; adding an Empire does not start a provider refresh.

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
