## Outcome

A researcher can save why a company deserves attention and record the conditions that would strengthen or weaken that view.

## User path

1. Open **Focus** or a company-intelligence page.
2. Create a research case for a ticker.
3. Write a thesis, supporting observations, risks, and watch conditions.
4. Reopen the case and compare the notes with current provider facts.

## Vertical slice

- Add user authentication before storing private research.
- Store research cases separately from Sectors facts and system inferences.
- Model a case with a ticker, thesis, status, observations, risks, watch conditions, created time, and updated time.
- Let a user reference an existing fact or event without copying it into the case.
- Show when a referenced provider record has a newer `asOf` or retrieval date.
- Add a research-case panel to company intelligence and a saved-cases filter to **Focus**.

## Acceptance criteria

- A user can create, edit, archive, and reopen a case.
- Only the owning user can read or change the case.
- Editing a case never changes provider facts.
- A referenced fact resolves by stable domain ID.
- The interface separates user text from Sectors evidence.
- Watch conditions are observations to revisit, not automated trade instructions.
- An archived case remains readable.

## Non-goals

- Brokerage integration.
- Order entry.
- Public social profiles.
- AI-generated investment recommendations.

## Verification

- Test authorization on every query and mutation.
- Test stable evidence references and stale-reference display.
- Browser-test create, edit, archive, and cross-user denial.
- Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.

