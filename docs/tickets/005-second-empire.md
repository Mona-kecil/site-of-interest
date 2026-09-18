## Outcome

A researcher can select and inspect a second Indonesian conglomerate without adding special cases to the Prajogo code path.

## User path

1. Open the Empire selector.
2. Choose a second Sectors-backed group.
3. Explore its relationship graph.
4. Open any discovered listed company.
5. See explicit evidence and coverage gaps.

## Vertical slice

- Probe Sectors group coverage and choose the candidate with the strongest returned ownership and company-report coverage.
- Replace Prajogo-only sync constants with a validated Empire discovery definition.
- Keep group-specific extension probes explicit. Do not force mining logic onto a group without mining coverage.
- Generate a second corpus through the same validation boundary.
- Import both corpora idempotently into Convex.
- Add an Empire selector that lists imported corpora.
- Reuse the existing Empire and company routes without branching on the new slug or ticker.

## Acceptance criteria

- The second corpus uses only Sectors facts and derived records.
- The generic discovery path handles the subject, group label, listed descendants, company reports, sources, and coverage.
- A group-specific probe is isolated behind a named definition.
- No React component checks for `prajogo` to render the second Empire.
- The selector opens both Empires.
- At least one listed company in the second Empire has a complete company-intelligence page.
- The Prajogo corpus and existing routes remain unchanged in meaning.

## Non-goals

- Supporting every Indonesian conglomerate in one ticket.
- Pretending that every group has the same extension data.
- Merging legal entities across Empires before duplicate identity is proven.

## Verification

- Run both corpus validators from a clean cache.
- Test discovery-definition validation and idempotent import.
- Browser-test switching Empires and opening one company in each.
- Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.

