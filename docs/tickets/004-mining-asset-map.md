## Outcome

A researcher can move from a holding company to its operating mining sites and compare what Sectors reports about each location.

## User path

1. Open **Asset map** from the Prajogo Empire or CUAN company page.
2. Select a province on a 2.5D Indonesia map.
3. See the province elevate and list the Sectors-backed sites in that area.
4. Select a site to inspect ownership, commodity, production, capacity, limits, blockers, and evidence.

## Vertical slice

- Add `/assets/$ticker` and enable **Asset map** when an entity has asset coverage.
- Use a static Indonesia boundary asset only for presentation geometry.
- Treat every site, location assignment, production value, capacity, limit, and blocker as Sectors data.
- Normalize companies, sites, province assignments, operating facts, and explicit gaps.
- Store sites separately from company profiles and index them by parent entity and province.
- Build keyboard-accessible province and site selection.
- Keep sites without usable coordinates or province data in an **Unmapped** list.

## Acceptance criteria

- The first complete path covers the CUAN mining branch returned by Sectors.
- Selecting a province changes both the map state and the site list.
- Every map mark has a matching text entry.
- A site panel distinguishes reported capacity from reported production.
- Missing production, coordinates, limits, or blockers appear as gaps.
- The map does not estimate a location from a company address.
- The page works without WebGL and honors reduced-motion settings.
- The document has no horizontal overflow at 390px.

## Non-goals

- Satellite imagery.
- Live vehicle or shipment tracking.
- Production estimates derived from outside sources.
- A generic global map before the Indonesia journey works.

## Verification

- Validate that every site references an existing entity and source.
- Unit-test province grouping and the **Unmapped** path.
- Browser-test province selection, site selection, keyboard use, and reduced motion.
- Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.

