# Delivery checklist

The current application covers the IDX screener, company research, owner records and Sectors business-group labels. The hackathon deadline is 8 October 2026.

## Current surface

- Six lenses expose 19 registry-defined checks for 962 companies.
- Every applicable result has a value or gap, period and cited inputs.
- Annual records span 2019–2025; quarter slots span Q3-2024–Q2-2026.
- Owner detail retains raw holdings and reported holder names, co-holders and one upstream level for listed owners. Six reviewed spelling aliases share canonical links and prefer target display names.
- Provider business-group labels remain attributed and may overlap.
- Import enforces a 256-element cap per array column and prints column maxima in the dry run.

## Known follow-ups

- Establish identity before merging further spelling pairs. Gwie Gunadi/Gunato Gunawan, Adaro Strategic Investment/Investments, Andrianto/Arianto Oetomo and Jusuf/Jusup Sutrisno remain separate.
- Revisit array storage if a future snapshot exceeds the 256-element import cap.

Use the [demo](../demo.md) for the research path, [product brief](../product-brief.md) for the check registry, and [data contract](../universe-data.md) for the pipeline and source limits.
