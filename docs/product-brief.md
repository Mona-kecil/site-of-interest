# Site of Interest product brief

## Product

Site of Interest helps an Indonesian market researcher understand a conglomerate as a connected system instead of reading one ticker at a time.

`Empire` is one view inside the product. It maps ownership relationships and connects each listed company to its financial and operating signals.

## First research question

What does the Sectors dataset reveal about Prajogo Pangestu's listed-company network and CUAN mining branch?

The first complete path is:

```text
Prajogo Pangestu
├── 71.37% of BRPT
│   ├── 64.637% of BREN
│   └── 34.63% of TPIA
│       └── 60% of CDIA
├── 5.03% of TPIA
└── 80.418% of CUAN
    ├── controlled mining subsidiaries
    ├── 41.5% of PTRO
    │   └── 19.88% of SINI
    └── inferred group link to KJP
        └── 7.9% of SINI
```

Listed-company profiles combine Sectors ownership, market, financial, and valuation responses. The CUAN branch adds mining-company and mining-site responses. The interface exposes two current boundaries: Sectors returns no mining sites directly against the CUAN holding-company record, and its PRDL ownership response does not establish the claimed Prajogo link.

## Data rule

The hackathon build accepts only Sectors MCP or REST API data. No prospectus, news article, issuer website, annual report, or manually entered market fact may enter the generated corpus.

Derived signals are allowed when every input comes from Sectors. The interface labels them as calculations and never presents them as investment recommendations.

## Initial user outcome

A user can:

1. See the Sectors-backed ownership path from Prajogo to CUAN and PTRO.
2. Inspect each relationship and the exact Sectors endpoint behind it.
3. Open any listed profile for market data, financial history, valuation cycle, and derived signals.
4. Open the Cycle board to compare earnings support, cash delivery, and peer-premium risk.
5. See missing Sectors coverage instead of fabricated completeness.

## Explicit non-goals

- Reconstructing relationships from outside research.
- Filling API gaps with synthetic or manually sourced facts.
- Recommending whether a user should buy or sell a security.
- Claiming beneficial ownership beyond the relationship returned by Sectors.
