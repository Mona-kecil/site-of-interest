# Real app architecture

## Goal

The React application reads one normalized Empire from Convex. The first route is `/empire/prajogo`. It renders entities, ownership relationships, and the Sectors assertions that support each relationship.

## Usage

```ts
const empire = useQuery(api.empires.getBySlug, { slug: "prajogo" });
```

`getBySlug` returns one object with `manifest`, `entities`, `relationships`, `assertions`, and `sources`. React components do not query storage tables or Sectors endpoints directly.

## Data ownership

- `data/empires/prajogo/` is the checked-in Sectors corpus during the migration.
- `convex/seed.ts` imports that corpus into Convex with stable string IDs.
- `convex/empires.ts` owns the public read model.
- `src/features/empire/` owns layout and interaction state.
- Convex `_id` values stay inside Convex functions.

## Synthesis decision

The repository replaces the root prototype instead of keeping two frontends. Git preserves the prototype at commit `ff7e544`. The existing ingestion scripts stay in place until Convex actions replace their filesystem writes.

The graph uses indexed edge documents rather than recursive storage queries. `getBySlug` loads one bounded Empire. The browser derives the visible layout from that complete read model.
