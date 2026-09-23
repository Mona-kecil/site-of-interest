# Prajogo empire discovery

## Outcome

The sync produces every Prajogo-linked company relationship that the current Sectors responses can prove. It does not silently convert name similarity, an executive role, or an outside claim into ownership.

## Designs considered

### A. Curated ticker registry

Keep a local list such as `BRPT`, `TPIA`, `BREN`, `CDIA`, `CUAN`, and `PTRO`, then fetch each report.

This controls API usage, but the list becomes an uncited source of truth. It also goes stale when a listed child appears.

### B. Bounded ownership traversal

Start with the Sectors company screener for exact Prajogo holdings. Query exact company names in the screener's major-shareholder field until no new listed children appear. Traverse the Sectors mining ownership tree for the mining branch. Fetch the same report sections for every discovered listed company.

This costs more credits on a cold run, but it is repeatable, auditable, and does not require outside data. Responses are cached locally so ordinary reruns consume no credits.

### C. Group-first, ownership-audited discovery

Query the Sectors screener's `affiliates` field to seed the listed group universe. Confirm and extend that universe with each company report's `ownership.conglomerates_group` field. Then run the bounded ownership traversal to explain control, find children, and expose conflicts.

This finds companies that a shareholder-name seed misses, but it requires a strict distinction between group classification and legal ownership.

## Decision

Use design C. Sectors group classifications create `group_membership` relationships with unknown control and no ownership percentage. Only exact shareholder or mining-subsidiary records create ownership relationships. Ownership-path tracing excludes group links.

Treat `affiliates` as the canonical entry point for listed-company discovery across every Empire, not as the complete Empire map. Each discovery definition supplies an exact provider affiliate label. The importer stores the query, retrieval time, returned tickers, and source field in the manifest. Company reports and ownership traversal reconstruct the rest of the visible structure.

Do not maintain a hand-written ticker list as the source of membership. A local list may exist as a test fixture or expected-result check, but the latest imported provider response determines the registry. If an expected ticker disappears, record a coverage change for review instead of silently adding it back.

The Prajogo run demonstrates why both halves matter. The Barito affiliate query added RATU and SSIA. SSIA's 63.94% stake then added NRCA through ownership traversal. RATU's report identifies RAJA as its 68.68% parent, so RAJA remains an outside boundary owner rather than being misclassified as part of Prajogo's controlled chain. SINI was absent from the affiliate search but re-entered through its `Barito Group` report label and the PTRO ownership path.

For private entities, store every corporate shareholder returned by a discovered listed company's Sectors report, but classify it before presentation. A private entity becomes an `empire` node only when separate Sectors evidence supports its group affiliation. Every other corporate shareholder is a `boundary` node: retained with its direct stake and evidence, hidden from the default Empire view, and available under All owners. This preserves counterparties such as SCG Chemicals or Green Era without misclassifying them as Prajogo companies.

The rejected alternative was to draw every corporate shareholder in the default view. It maximized immediate coverage but made outside investors visually indistinguishable from group companies and turned the graph into a shareholder list rather than an empire map.

The analysis command reports numeric P/E, earnings, cash-flow, and debt measurements. It does not assign a valuation-cycle stage or rank companies by one.

## Boundaries

- “Entire empire” means the graph reachable in the current Sectors dataset, plus explicitly scoped outside corporate shareholders at its boundary—not every privately held or rumored interest.
- Affiliation is not ownership.
- A company may belong to several Sectors conglomerate groups. Membership edges never imply exclusive control.
- Listed upstream owners outside the selected group remain boundary entities, just like private outside shareholders.
- P/E changes, earnings changes, cash-flow conversion, and peer P/E are shown as separate values when their inputs exist.
- PRDL is a named coverage gap when its Sectors ownership response does not establish the claimed link.
- KJP's 45.328% PTRO and 7.9% SINI stakes are direct reported holdings. A Sectors news record separately names KJP as a CUAN subsidiary. The graph does not invent CUAN's ownership percentage in KJP or aggregate either stake into CUAN.
- Sectors' mining ownership response reports CUAN at 41.5% of PTRO, while PTRO's company report names KJP at 45.328% and does not name CUAN. The corpus preserves both records and flags the inconsistency; consumers must not sum them.
