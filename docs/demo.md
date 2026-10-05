# Three-minute demo

Use the checked-in 5 October 2026 snapshot in an imported dev deployment. Open `/`. Show the tally, "87 of 962 IDX companies are worth a look. 612 raise a red flag.", and the ratings chart, then type `BREN` in the lookup to see its Red flags rating. Under Where to start, open Worth a look. On Ideas, show the rules disclosure, Worth a look and Red flags with their evidence. Open TLKM to show its Worth a look panel and its track record from FY2021, or DCII to show its price flag and current P/E above 50. Return through Ideas, then click Screener for the measurement path below. Verdicts apply fixed rules; measurement values keep their units and gaps.

## Click path

| Time | Exact clicks | What to show |
| --- | --- | --- |
| 0:00–0:25 | In Search companies, enter `AADI`. Keep Cash selected. Click the AADI Cash conversion cell. | The cell says No data, with "No data for operating cash flow 2023." under it. In the panel, How it's calculated lists Operating cash flow, 2023 as No data beside the five figures the provider has. Close the panel. |
| 0:25–0:50 | Replace the search with `ASII`. Click ASII Cash conversion. | The value is 1.23× for 2023–2025. The panel explains it in one sentence: "Operating cash flow divided by earnings, each added up over three years." The first figure is Operating cash flow, 2023, IDR 33,746.00 bn. The last line reads "Source: Sectors, retrieved 2 Oct 2026." Close the panel. |
| 0:50–1:25 | Replace the search with `BBCA`. Click the Banks lens, then BBCA NPL ratio. Click BBCA company page. | The NPL ratio is 1.65% for 2025. On the company page, click Banks in Company sections; Banks becomes the highlighted link. The NPL ratio card says "Ranks 14th of 46 banks with data." The strip reads Worse on the left and Better on the right and marks BBCA with a diamond. Open How it's calculated for Non-performing loans, 2025 and Gross loans, 2025. In the yearly figures, non-performing loans read No data for 2019 to 2021, and the footnote says the data provider doesn't have the figure. |
| 1:25–2:05 | Click Owners in Company sections. Show the network, then click PT Dwimuria Investama Andalan in the holders table. | The network puts BBCA in the center pill with Dwimuria Investama Andalan above it at 54.94%, and TOWR and SSIA as the other listed companies Dwimuria owns. The owner page draws the same three companies around Dwimuria, BBCA at 54.94%, TOWR at 19.95% and SSIA at 10.24%, each with its other shareholders of at least 1%. |
| 2:05–2:35 | Click Groups in Product sections. Click Hartono. | The intro says groups are the data provider's labels and don't prove control. The network shows the nine members, each with up to two of its largest shareholders, and dashed blue lines where a shareholder owns another member. BBCA's ROE cell reads 20.79%. |
| 2:35–3:00 | Click Owners in Product sections. Enter `Bank Of Singapore` in Search owners. Click Bank Of Singapore Limited. In the network, click +1 more. | The page labels the holder Custodian or nominee account and says it may hold shares for clients. The network draws eight of its nine companies; +1 more jumps to the nine-row Companies it holds table. |

Ideas cards, screener symbol and name links, the panel's company page link and network nodes use client-side navigation. The +1 more node stays on the owner page.

## Number and gap locators

All raw numbers below come from [checks.json](../data/universe/checks.json), [holdings.json](../data/universe/holdings.json), [years.json](../data/universe/years.json) or [owners.json](../data/universe/owners.json). Reporting periods belong to the cited row, not the source retrieval date.

| Symbol / record | Check or field | Period | Stored value / display |
| --- | --- | --- | --- |
| AADI | `cash_conversion`, input `operating_cash_flow[2023]` | FY2023–FY2025; input FY2023 | Check and input null; gap `Not reported: operating_cash_flow[2023]` → No data, "No data for operating cash flow 2023." |
| ASII | `cash_conversion` | FY2023–FY2025 | `1.2266066620967822` → 1.23× |
| ASII | `cash_conversion`, input `operating_cash_flow[2023]` | FY2023 | `33746000000000` IDR → IDR 33,746.00 bn |
| BBCA | `npl_ratio` | FY2025 | `0.016539819950137886` → 1.65%; 46 banks with data, lower is better → Ranks 14th |
| BBCA | `npl_ratio`, input `non_performing_loan[2025]` | FY2025 | `16047483000000` IDR → IDR 16,047.48 bn |
| BBCA | `npl_ratio`, input `gross_loan[2025]` | FY2025 | `970233234000000` IDR → IDR 970,233.23 bn |
| BBCA | `nonPerformingLoan` in years.json | FY2019–FY2021 | null → No data |
| BBCA / PT Dwimuria Investama Andalan | `largest_holder`; holding `percentage` | current snapshot | `0.54942` → 54.94% |
| BBCA / Hartono member | `roe` | FY2025 / average FY2024–FY2025 | `0.2078712625879883` → 20.79% |
| Bank Of Singapore Limited | owner key `bank of singapore`, distinct holding symbols | current snapshot | `companyCount: 9`; network shows eight companies and +1 more |

[sources.json](../data/universe/sources.json) keeps the endpoint, field batch and row range behind each input; the screen shows only the provider and retrieval date. [groups.json](../data/universe/groups.json) supplies Hartono membership. These labels report provenance and membership; they do not establish control.
