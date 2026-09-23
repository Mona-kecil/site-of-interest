# Research cases

## Outcome

An authenticated researcher saves signals and news, then writes a private conclusion without changing provider facts or calculations.

## User path

1. Open a measured signal or news item.
2. Create or select a research case.
3. Save record references and write notes or questions.
4. Change the case status.
5. Reopen the case and inspect its citations.

## Vertical slice

- Add an authentication provider and `convex/auth.config.ts`.
- Store cases, notes, questions, citations, and status in user-owned tables.
- Derive ownership from the authenticated Convex identity on every read and write.
- Reference records by stable domain key.
- Show when a signal has expired, changed, or been superseded.
- Keep user text separate from facts and calculations.

## Acceptance criteria

- A user can create, edit, archive, and reopen a case.
- Only the owner can read or change the case.
- A client-supplied user ID never grants access.
- Editing user text never changes a provider record or calculation.
- A case retains a citation when a signal is superseded.
- The interface labels every note as user-authored.

## Non-goals

- Public profiles or shared cases
- Automated trade instructions
- AI-written conclusions
- Brokerage integration

## Verification

- Test every query and mutation as the owner, another user, and an unauthenticated caller.
- Test stable citations and superseded signals.
- Browser-test create, edit, archive, reopen, and cross-user denial.
- Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.
