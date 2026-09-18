# Product tickets

These tickets continue the product after Empire and public-company intelligence. Each ticket delivers a complete user journey.

GitHub issues own execution status. The local files preserve the accepted scope and remain reviewable with the code.

## Sequence

| Order | Issue | Scope | Priority | Depends on |
| --- | --- | --- | --- | --- |
| 1 | [#1 Focus research queue](https://github.com/Mona-kecil/site-of-interest/issues/1) | [Ticket](001-focus-research-queue.md) | P0 | Company intelligence |
| 2 | [#2 On-demand broker flow](https://github.com/Mona-kecil/site-of-interest/issues/2) | [Ticket](002-on-demand-broker-flow.md) | P0 | Existing flow collector |
| 3 | [#3 Corporate-action timeline](https://github.com/Mona-kecil/site-of-interest/issues/3) | [Ticket](003-corporate-action-timeline.md) | P1 | Company intelligence |
| 4 | [#4 Mining asset map](https://github.com/Mona-kecil/site-of-interest/issues/4) | [Ticket](004-mining-asset-map.md) | P1 | Empire and CUAN mining data |
| 5 | [#5 Second Sectors-backed Empire](https://github.com/Mona-kecil/site-of-interest/issues/5) | [Ticket](005-second-empire.md) | P1 | Stable Empire and company contracts |
| 6 | [#6 Research cases and watch conditions](https://github.com/Mona-kecil/site-of-interest/issues/6) | [Ticket](006-research-cases.md) | P2 | Focus and Flow |

Tickets 1 and 2 form the next product loop: choose a company, then inspect current market participation. Tickets 3 and 4 explain what may change the company. Ticket 5 proves that the product is not hard-coded to Prajogo. Ticket 6 stores the user's research decision without turning it into a recommendation.

## Rules

- Read [`system-design.md`](../system-design.md) before changing a data contract.
- Read [`product-design-system.md`](../product-design-system.md) before changing a route.
- Keep every ticket vertical.
- Split a ticket only when each resulting ticket still ends in a usable journey.
- Update this index when a GitHub issue replaces a local ticket.
