# Product design system

The research surface uses a dark canvas, pale text, thin rules and tabular numbers. Typography and hierarchy distinguish data, evidence and navigation. Measurement values carry no judging color or rating. Selection and keyboard focus can use an accent; the accent describes interaction state.

## Typography and layout

Use DM Mono for values, symbols, dates and compact table labels. Use Manrope for company names, explanations and evidence. Keep long body text at least 13 px and working table text at least 11 px. Wrap names and sources before shrinking text.

A header identifies the subject. The screener places filters above a horizontally scrollable table and opens a persistent evidence panel. Company sections follow lens order and put check evidence beside annual records. Owner pages put a capped graph above the full holdings table. At 390 px, tables and graphs scroll within their wrappers; endpoints wrap within disclosures. The document has no horizontal overflow.

## Measurement states

| State | Primary text | Secondary text | Interaction |
| --- | --- | --- | --- |
| Measured | Unit-formatted value | `p84 · 31 peers` | Open formula and inputs |
| Measured with too few peers | Unit-formatted value | `3 peers · no percentile` | Open formula and inputs |
| Gap: missing input | Not reported | Human reason in tooltip or panel | Open available evidence |
| Gap: undefined base | Not meaningful | Human reason in tooltip or panel | Open available evidence |
| Gap: short history | Too little history | Human reason in tooltip or panel | Open available evidence |
| Excluded check | Does not apply | None | Quieter text, no button |

Gap cells have no peer line. Null stays Not reported in raw inputs and financial history. A reported zero keeps its number and unit. Neither peer percentile nor rank position assigns a direction.

## Evidence

Put `Operating cash flow · FY2023` before the secondary provider code `operating_cash_flow[2023]`. Replace known gap field codes with human labels and fiscal years. Keep unknown gap patterns as raw text so a new provider reason remains visible.

IDR inputs use billions, such as `IDR 19,364.41 bn`, with the exact raw number in the value title. Ratios follow the check unit; fractions render as percentages and share counts retain their count format. Tax-rate annotations retain the selected ROIC tax rule.

A source line names Sectors, endpoint path, field batch, row range and retrieval date. The stored manifest has ten field batches; the final page ends at row 962. The full query endpoint stays in a Full endpoint disclosure and wraps within the page. Source retrieval time is distinct from the financial reporting period.

## Peer and ownership graphs

Peer dots use rank spacing. Ties share a position and a single peer sits at the center. Lowest and highest label the ends, with the reported peer count between them. A diamond outlines the current company; each dot exposes its symbol and value in a title. Missing check results appear in a Check gaps disclosure.

Ownership columns sort by largest reported stake descending, then name. Each column displays at most eight entities and a final +N more link to its full table or list. Edge labels retain each reported source percentage. Full names remain in SVG titles when display labels wrap or truncate.

Custodian or nominee account labels use neutral text and explain that a holder of record may hold for clients. They appear on the owner page, in the owners list and beside the company holder. The label does not identify the beneficial owner.

## Interaction and accessibility

Use TanStack Links for route changes and native anchors for sections. Check buttons have symbol/check names, gap descriptions, disclosure state and a panel control reference. Lens tabs support arrow keys, Home and End. The evidence panel takes focus, closes with Escape and returns focus to the selecting cell.

Keep keyboard focus visible. Provide textual values for visual marks. Use scroll-region names for wide tables and graphs. Keep disclosure summaries reachable and source text wrapped. Preserve the workflow under reduced motion. [Browser specs](../e2e/company.spec.ts) verify narrow-screen evidence containment after opening full endpoints.
