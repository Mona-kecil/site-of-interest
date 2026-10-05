# Three-minute demo

This is the path the judging video follows. Use https://site-of-interest.vercel.app, or the checked-in 5 October 2026 snapshot in an imported dev deployment, in a browser profile that has not opened the site, so the tour invite appears.

## Click path

| Time | Exact clicks | What to show |
| --- | --- | --- |
| 0:00–0:20 | Open `/`. | The headline reads "78 of 962 IDX companies are worth a look. 612 raise a red flag." |
| 0:20–0:30 | In the tour invite, click Start the tour. Press Escape after stop 1. | Stop 1 rings the ratings chart. Escape ends the tour and returns focus to Take the tour. |
| 0:30–0:55 | In the ratings chart, hover TLKM's five marks, then DCII's Price mark. | TLKM passes all five pillars. DCII's Price callout shows P/E against its history at 1.89× and P/E, trailing at 413.6, both over their flag lines. |
| 0:55–1:20 | Click Ideas. Open one Worth a look card's lines, then scroll to Red flags. | The heading reads Worth a look · 69, and the subhead reads "Companies worth at least IDR 1T: 69 of the 78 across the market." Each card line gives the number and its pass or flag line. Red flags · 313 lists the line each company crossed. |
| 1:20–1:55 | Open TLKM. Click See cash details, then How it's calculated under Cash conversion. Scroll to the track record. | The verdict is Worth a look. Cash conversion is 2.82× for FY2023–FY2025: operating cash flow divided by earnings, each added up over three years. How it's calculated lists the six figures and "Source: Sectors, retrieved 2 Oct 2026." The track record rates cash, returns and the balance sheet for FY2021 to FY2025. |
| 1:55–2:15 | Click Screener, enter `AADI` in Search companies and open AADI. Click See cash details. | The verdict is Mixed: "No flags, but Cash, Price and Owners fall short of a pass. Worth a look needs cash and the balance sheet to pass." The Cash pillar reads "Nothing flagged, but some figures are missing", with FCF yield passing and Cash conversion, 3 yrs: No data. The cash section reads "No data for operating cash flow 2023." |
| 2:15–2:38 | Open BBCA, click Owners in Company sections, then click PT Dwimuria Investama Andalan in the holders table. | The network puts Dwimuria Investama Andalan above BBCA at 54.94%. The owner page shows the same holder on BBCA at 54.94%, TOWR at 19.95% and SSIA at 10.24%, and reads "On the shareholder list of 3 companies". |
| 2:38–3:00 | Show the README's One verdict, traced end to end, then return to `/`. | TLKM's cash conversion goes from six Sectors figures to 2.82×, a passing Cash pillar and a Worth a look verdict. A cold sync is 10 field batches of five pages each; browsing reads the stored snapshot and makes no Sectors requests. |

Ideas cards, screener links and network nodes use client-side navigation.

## More to show with time to spare

- In the Screener, choose the Banks lens and open BBCA's NPL ratio: 1.65% for 2025, ranked 14th of 46 banks with data.
- Under Groups, open Hartono. The network shows the nine members and dashed blue lines where a shareholder owns another member. Groups are the provider's labels and do not prove control.
- Under Owners, search `Bank Of Singapore`. The page labels it a custodian or nominee account. Its network draws eight of nine companies, and +1 more jumps to the full table.
- At 390 px, owner and company networks become a Held by and Holds list.

## Number and gap locators

All raw numbers below come from [checks.json](../data/universe/checks.json), [holdings.json](../data/universe/holdings.json), [years.json](../data/universe/years.json), [companies.json](../data/universe/companies.json) or [owners.json](../data/universe/owners.json). Reporting periods belong to the cited row, not the source retrieval date.

| Symbol / record | Check or field | Period | Stored value / display |
| --- | --- | --- | --- |
| TLKM | `cash_conversion` | FY2023–FY2025 | `2.8175484300925433` → 2.82× |
| TLKM | `cash_conversion`, inputs | FY2023–FY2025 | Operating cash flow IDR 60,581.00, 61,600.00 and 63,842.00 bn; earnings IDR 24,560.00, 23,649.00 and 17,814.00 bn; source `universe-03-800`, retrieved 2 Oct 2026 |
| DCII | `pe_vs_history` | Current against median since 2020 | `1.8887784467626925` → 1.89×, flagged above 1.5× |
| DCII | `current.peTtm` | Trailing twelve months | `413.610603642159` → 413.6, flagged above 50 |
| AADI | `cash_conversion`, input `operating_cash_flow[2023]` | FY2023–FY2025; input FY2023 | Check and input null; gap `Not reported: operating_cash_flow[2023]` → No data |
| BBCA / PT Dwimuria Investama Andalan | `largest_holder`; holding `percentage` | current snapshot | `0.54942` → 54.94% |
| BBCA | `npl_ratio` | FY2025 | `0.016539819950137886` → 1.65%; 46 banks with data, lower is better → Ranks 14th |
| Bank Of Singapore Limited | owner key `bank of singapore`, distinct holding symbols | current snapshot | `companyCount: 9`; network shows eight companies and +1 more |

[sources.json](../data/universe/sources.json) keeps the endpoint, field batch and row range behind each input; the screen shows only the provider and retrieval date. [groups.json](../data/universe/groups.json) supplies Hartono membership. These labels report provenance and membership; they do not establish control.
