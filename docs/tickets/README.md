# Delivery checklist

The current application covers the IDX screener, company research, owner records and Sectors business-group labels. The hackathon deadline is 8 October 2026.

## Current surface

- Six lenses expose 19 registry-defined checks for 962 companies.
- Every applicable result has a value or gap, period and cited inputs.
- Annual records span 2019–2025; quarter slots span Q3-2024–Q2-2026.
- Owner detail retains raw holdings, co-holders and one upstream level for listed owners.
- Provider business-group labels remain attributed and may overlap.

## Known follow-ups

- Merge reviewed spelling variants of one owner that the canonical key keeps apart, such as "Internasional"/"International" and "Soeryadjaja"/"Soeryadjaya", so listed holders link to their company.
- Enforce a length cap on stored array columns at import time.

Use the [demo](../demo.md) for the research path, [product brief](../product-brief.md) for the check registry, and [data contract](../universe-data.md) for the pipeline and source limits.
