# Empire context

Status: implemented for the Prajogo corpus. Fundamental and news details link to the graph with the relevant listed company selected. The graph shows a link back to the exact originating record. The Convex graph read stops with an error if any of its four record groups exceeds 500 rows, so it cannot silently truncate a larger Empire.

## Outcome

A researcher opens a signal, company, or news item and sees where its subject sits inside an imported conglomerate.

## User path

1. Open a signal, company, or news item.
2. Select **Empire context**.
3. See the subject highlighted in the relationship graph.
4. Follow a relationship and inspect its provider evidence.

## Vertical slice

- Treat the Empire graph as contextual navigation, not the default route.
- Replace unbounded Convex graph reads with documented limits or pagination.
- Separate Empire members from boundary entities.
- Show provider group labels as attributed provider facts.
- Remove the app-derived CUAN-to-KJP relationship unless a provider record states it.
- Open the graph with the originating subject selected.
- Keep graph layout and filtering in pure model functions.

## Acceptance criteria

- Every node resolves to one imported entity.
- Every edge resolves to a relationship and source assertion.
- The interface distinguishes ownership, control, and provider group labels.
- The default context excludes boundary entities.
- The graph returns to the originating signal, company, or news item.
- No component checks a ticker to choose behavior.

## Non-goals

- Making the graph the home page
- Cross-Empire identity merging
- Fundamental or news calculations inside graph components

## Verification

- Unit-test graph filters, selected-subject paths, and boundary handling.
- Browser-test signal-to-Empire and news-to-Empire navigation.
- Run `npm run check`, `npm test`, `npm run test:e2e`, `npm run build`, and `npm run validate`.

## Evidence boundary

The CUAN-to-KJP link states only the provider's attributed subsidiary claim. Its ownership percentage and control remain unknown.
