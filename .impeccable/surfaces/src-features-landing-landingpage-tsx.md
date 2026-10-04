---
version: 1
slug: "src-features-landing-landingpage-tsx"
primary_target: "src/features/landing/LandingPage.tsx"
related_targets: ["src/router.tsx","src/features/ideas/IdeasPage.tsx","src/features/company/CompanyProfilePage.tsx","src/features/universe/UniversePage.tsx","src/features/owners/OwnersPage.tsx","src/features/owners/OwnerPage.tsx","src/features/owners/GroupsPage.tsx"]
---

## Scope

The landing at `/` for newcomers and Sectors hackathon judges (Persuade mode). It sets the visual world that Ideas, the screener, company, owner and group pages inherit.

## Job

In seconds a first-time visitor learns that the app rates every IDX company on five questions, that the data is real Sectors data with a date, and that every mark leads back to its numbers. The primary action is to rate a ticker or open Ideas.

## Direction contract

THESIS: A consumer-test ratings chart for the IDX: a published table of marks per company with the method printed beside it. It refuses the fintech default of a hero, a gradient dashboard mock and three feature cards.

OWN-WORLD: Cool paper ground, near-black ink, one ultramarine for interaction and the Worth a look stamp, red only for flags. Harvey-ball marks (full, half, crossed red, dotted, dash), rubber-stamp verdict boxes, heavy 4px ink rules over thin row rules, Libre Franklin at heavy weights with tabular numbers.

STORY: The visitor reads the tally, scans eight familiar companies, points at a mark to see its number and line, rates a ticker they own, sees each rule drawn as a pass line and a flag line, follows Telkom's cash mark to its Sectors rows, then opens Ideas or the screener.

FIRST VIEWPORT: Blue masthead with wordmark, section nav and data date. A headline set large across the left two thirds: "87 of 962 IDX companies are worth a look. 612 raise a red flag." with a short standfirst. Directly under it the ratings chart: title and hint on the left, the ticker lookup and the numbers toggle on the right, then the first rows of the chart. The lookup is the primary action.

FORM: Ratings chart, position 3 of 7 on the ordered list (lab report, school report card, ratings chart, guide, tear sheet, bubble sheet, grade placard). Seed key e963b584. Code-led; the approved prototype at /tmp/soi-proto/landing.html is the decision comp.

SIGNATURE: Marks fill in row by row and stamps land once on load (420 ms fill, 320 ms stamp, ease-out); hover or tap on a mark opens a callout with the measurement and its line. Reduced motion swaps both for a 200 ms fade.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

Past verdicts (FY2021 to FY2025) and an analyst-estimates view are proposed and not yet approved.
