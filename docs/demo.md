# Three-minute demo

Use the checked-in 2 October 2026 snapshot in an imported dev deployment. Open `/`. Show the verdict tally and the ratings chart, then type `BREN` in the lookup to rate it. Under Where to start, open Worth a look. On Ideas, show the rules disclosure, Worth a look and Red flags with their evidence. Open TLKM to show its Worth a look panel, or DCII to show its price flag and current P/E above 50. Return through Ideas, then click Screener for the measurement path below. Verdicts apply fixed rules; measurement values retain their units and gaps.

## Click path

| Time | Exact clicks | Evidence to show |
| --- | --- | --- |
| 0:00–0:25 | In Search companies, enter `AADI`. Keep Cash selected. Click the AADI Cash conversion cell. | The cell says Not reported with no peer line. The panel says Operating cash flow FY2023 not reported. Close the panel. |
| 0:25–0:50 | Replace search with `ASII`. Click ASII Cash conversion. | The value is 1.23× and the peer line says 3 peers · no percentile. The first input says Operating cash flow · FY2023 and IDR 33,746.00 bn. Hover the value for its raw number. Close the panel. |
| 0:50–1:25 | Replace search with `BBCA`. Click the Banks lens, then BBCA NPL ratio. Click BBCA company page. | The NPL ratio is 1.65%, p29 · 46 peers. On the company page, click Banks in Company sections, then Formula and inputs · NPL ratio. Show Non-performing loans · FY2025, the source batch/range/date line and Full endpoint. The strip labels lowest/highest and marks BBCA with a diamond. |
| 1:25–2:05 | Click Owners in Company sections. In the Holdings table, click PT Dwimuria Investama Andalan. | The company holder stake is 54.94%. The owner page links the same holding back to BBCA and keeps the source and other entity holders. |
| 2:05–2:35 | Click Groups in Product sections. Click Hartono. | The page attributes membership to Sectors, states that control has not been verified, and shows BBCA among the members. BBCA's ROE cell reads 20.79% for its FY2025 average-equity check. |
| 2:35–3:00 | Click Owners in Product sections. Enter `Bank Of Singapore` in Search owners. Click Bank Of Singapore Limited. In the graph, click +1 more. | The page labels the holder Custodian or nominee account and states that it may hold for clients. Eight company nodes link to the full nine-row holdings table. |

Ideas cards, the screener symbol and name links and the panel's company page link use client-side navigation. The graph overflow link stays on the owner page.

## Number and gap locators

All raw numbers below come from [checks.json](../data/universe/checks.json), [holdings.json](../data/universe/holdings.json), [years.json](../data/universe/years.json) or [owners.json](../data/universe/owners.json). Reporting periods belong to the cited row, not the source retrieval date.

| Symbol / record | Check or field | Period | Stored value / display |
| --- | --- | --- | --- |
| AADI | `cash_conversion`, input `operating_cash_flow[2023]` | FY2023–FY2025; input FY2023 | Check and input null; gap `Not reported: operating_cash_flow[2023]` |
| ASII | `cash_conversion` | FY2023–FY2025 | `1.2266066620967822` → 1.23×; `peerCount: 3`, percentile null |
| ASII | `cash_conversion`, input `operating_cash_flow[2023]` | FY2023 | `33746000000000` IDR → IDR 33,746.00 bn; source `universe-03-0` |
| BBCA | `npl_ratio` | FY2025 | `0.016539819950137886` → 1.65%; percentile `0.28888888888888886` → p29; `peerCount: 46` |
| BBCA | `npl_ratio`, input `non_performing_loan[2025]` | FY2025 | `16047483000000` IDR → IDR 16,047.48 bn; source `universe-07-0` |
| BBCA | `npl_ratio`, input `gross_loan[2025]` | FY2025 | `970233234000000` IDR → IDR 970,233.23 bn; source `universe-07-0` |
| BBCA / PT Dwimuria Investama Andalan | `largest_holder`; holding `percentage` | current snapshot | `0.54942` → 54.94%; source `universe-01-0` |
| BBCA / Hartono member | `roe` | FY2025 / average FY2024–FY2025 | `0.2078712625879883` → 20.79% |
| Bank Of Singapore Limited | owner key `bank of singapore`, distinct holding symbols | current snapshot | `companyCount: 9`; graph shows eight entities and +1 more |

[manifest.json](../data/universe/manifest.json) has ten field batches. [sources.json](../data/universe/sources.json) maps BBCA's NPL inputs to Sectors · /v2/companies/ · batch 7 of 10 · rows 1–200 · 2 Oct 2026. [groups.json](../data/universe/groups.json) supplies Hartono membership. These labels report provenance and membership; they do not infer control.
