# Product design system

The research surface uses a light paper canvas, near-black ink and tabular numbers. Heavy ink rules open sections and thin rules separate rows. Blue marks interaction, keyboard focus and the Worth a look stamp; red marks flags only. Pillar outcomes use filled, half-filled, crossed, dotted and dash marks, each with its Passes, Partly passes, Flagged, Not reported or Not checked label in text. Measurement values stay neutral.

## Typography and layout

Use Libre Franklin throughout, served from the app bundle, with tabular lining numbers for values, dates and tables. Headings run heavy with tight tracking; symbols on company pages are the largest type. Keep long body text at least 14 px and compact labels at least 11 px. Wrap names and sources before shrinking text.

A header identifies the subject. The landing opens with the verdict tally, then a ratings chart with a ticker lookup and a numbers toggle, the rule lines, one traced number and three starting links. Inner pages share a head with the title on the left and a short intro on the right. Ideas opens with the screen's purpose and data date, a rules disclosure and two lists with reasons. The screener places filters, including Verdict, above a horizontally scrollable table and opens a persistent evidence panel. A company verdict panel sits under the header facts and links each applicable pillar to its existing section. Company sections follow lens order and put check evidence beside annual records. Owner pages put a capped graph above the full holdings table. At 390 px, the masthead keeps the Sectors data date beside the wordmark, and tables scroll within their wrappers with the row identifier pinned and a swipe cue; the screener and group tables drop their descriptive columns, and the screener moves each name under its symbol. The ownership graph becomes a top-to-bottom list of holders, the owner and holdings. Endpoints wrap within disclosures. The document has no horizontal overflow.

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

IDR inputs use billions, such as `IDR 19,364.41 bn`, with the exact raw number in the value title. Dividend per share uses IDR per share, such as `IDR 184.00 per share`. Ratios follow the check unit; fractions render as percentages and share counts retain their count format. Tax-rate annotations retain the selected ROIC tax rule.

A source line names Sectors, endpoint path, field batch, row range and retrieval date. The stored manifest has ten field batches; the final page ends at row 962. The full query endpoint stays in a Full endpoint disclosure and wraps within the page. Source retrieval time is distinct from the financial reporting period.

## Peer and ownership graphs

Peer dots use rank spacing. Ties share a position and a single peer sits at the center. Lowest and highest label the ends, with the reported peer count between them. A diamond outlines the current company; each dot exposes its symbol and value in a title. Missing check results appear in a Check gaps disclosure.

Ownership columns sort by largest reported stake descending, then name. Each column displays at most eight entities and a final +N more link to its full table or list. Edge labels retain each reported source percentage. Full names remain in SVG titles when display labels wrap or truncate.

Custodian or nominee account labels use neutral text and explain that a holder of record may hold for clients. They appear on the owner page, in the owners list and beside the company holder. The label does not identify the beneficial owner.

## Interaction and accessibility

Use TanStack Links for route changes and native anchors for sections. Check buttons have symbol/check names, gap descriptions, disclosure state and a panel control reference. Lens tabs support arrow keys, Home and End. The evidence panel takes focus, closes with Escape and returns focus to the selecting cell.

Keep keyboard focus visible. Provide textual values for visual marks. Use scroll-region names for wide tables and graphs. Keep disclosure summaries reachable and source text wrapped. The landing's marks fill in and its stamps land in under half a second with an ease-out curve; that is the only authored motion. Reduced motion swaps it for a short fade, and the workflow stays the same. [Browser specs](../e2e/company.spec.ts) verify narrow-screen evidence containment after opening full endpoints.
