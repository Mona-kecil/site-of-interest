# Product design system

The research surface uses a light paper canvas, near-black ink and tabular numbers. Heavy ink rules open sections and thin rules separate rows. Blue marks interaction, keyboard focus and the Worth a look stamp; red marks flags only. Pillar outcomes use filled, half-filled, crossed, dotted and dash marks, each with its Passes, Partly passes, Flagged, No data or Not checked label in text. Measurement values stay neutral.

## Typography and layout

Use Libre Franklin throughout, served from the app bundle, with tabular lining numbers for values, dates and tables. Headings run heavy with tight tracking; symbols on company pages are the largest type. Keep long body text at least 14 px and compact labels at least 11 px. Wrap names and sources before shrinking text.

A header identifies the subject. The landing opens with the verdict tally, then a ratings chart with a ticker lookup and a numbers toggle, the rule lines, one traced number and three starting links. Inner pages share a head with the title on the left and a short intro on the right. Ideas opens with the screen's purpose and data date, a rules disclosure and two lists with reasons. The screener places filters, including Verdict, above a horizontally scrollable table and opens a persistent evidence panel. A company verdict panel sits under the header facts and links each applicable pillar to its existing section. Company sections follow lens order and put check evidence beside annual records; the section navigation marks the section in view. Company, owner and group pages put an ownership network above the full tables. At 390 px, the masthead keeps the Sectors data date beside the wordmark, and tables scroll within their wrappers with the row identifier pinned and a swipe cue; the screener and group tables drop their descriptive columns, and the screener moves each name under its symbol. Ownership networks keep their drawn size inside a horizontal scroll box that opens centered on the subject. The document has no horizontal overflow.

## Measurement states

| State | Primary text | Secondary text | Interaction |
| --- | --- | --- | --- |
| Measured | Unit-formatted value | `Ranks 14th of 46 banks with data.` on company pages | Open How it's calculated |
| Measured, no other company with data | Unit-formatted value | `No other banks have this figure.` | Open How it's calculated |
| Gap: missing input | No data | Plain reason in tooltip or panel | Open available evidence |
| Gap: undefined base | Not meaningful | Human reason in tooltip or panel | Open available evidence |
| Gap: short history | Too little history | Human reason in tooltip or panel | Open available evidence |
| Excluded check | Does not apply | None | Quieter text, no button |

Gap cells have no rank sentence. Null shows as No data in inputs and financial history, with a footnote that the data provider lacks the figure. A reported zero keeps its number and unit. The screen shows ranks as plain sentences and never shows percentile codes. Checks with a better direction say Ranks; checks without one say Highest or Nth highest.

## Evidence

How it's calculated opens with one plain sentence, such as "Operating cash flow divided by earnings, each added up over three years." The figures follow as labelled values, such as `Operating cash flow, 2023`. Provider field codes and endpoints stay off the screen. Known gap reasons become plain sentences, such as "No data for operating cash flow 2023." Unknown gap patterns keep their raw text so a new provider reason stays visible.

IDR inputs use billions, such as `IDR 19,364.41 bn`, with the exact raw number in the value title. Dividend per share uses IDR per share, such as `IDR 184.00 per share`. Ratios follow the check unit; fractions render as percentages and share counts retain their count format. Tax-rate annotations retain the selected ROIC tax rule.

A source line reads `Sectors, retrieved 2 Oct 2026`. Source retrieval time is distinct from the financial reporting period.

## Peer and ownership graphs

Peer dots use rank spacing. Ties share a position and a single peer sits at the center. The ends read Worse and Better when the check has a direction, with Better on the right, and Lower and Higher otherwise. A diamond outlines the current company; each dot exposes its symbol and value in a title.

Ownership networks put the subject in a dark pill at the center. Owners sit above and holdings below, and a group's members sit around its name. Each first-ring dot shows its stake under its name. Dot area grows with the stake. Blue dots are listed companies, grey dots are other shareholders, and hollow dots are pooled or custodian accounts, which are never expanded. A party appears once; a second link to it is a dashed blue curve, labelled with its stake unless the label would cover a dot or a name. Only stakes of at least 1% are drawn. Full names and stakes remain in SVG titles when labels wrap or truncate.

Custodian or nominee account labels use neutral text and explain that a holder of record may hold for clients. They appear on the owner page, in the owners list and beside the company holder. The label does not identify the beneficial owner.

## Interaction and accessibility

Use TanStack Links for route changes and native anchors for sections. Check buttons have symbol/check names, gap descriptions, disclosure state and a panel control reference. Lens tabs support arrow keys, Home and End. The evidence panel takes focus, closes with Escape and returns focus to the selecting cell.

Keep keyboard focus visible. Provide textual values for visual marks. Use scroll-region names for wide tables and graphs. Keep disclosure summaries reachable and source text wrapped. The landing's marks fill in and its stamps land in under half a second with an ease-out curve; that is the only authored motion. Reduced motion swaps it for a short fade, and the workflow stays the same. [Browser specs](../e2e/company.spec.ts) verify narrow-screen containment after opening a calculation.
