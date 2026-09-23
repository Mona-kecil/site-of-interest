import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FundamentalBoard } from "./FundamentalBoard";

const route = getRouteApi("/focus/$empireSlug");

export function FocusPage() {
  const { empireSlug } = route.useParams();
  const fundamentals = useQuery(api.focus.getFundamentals, { empireSlug });

  if (fundamentals === undefined)
    return (
      <main className="route-state">
        <span className="loading-orbit" />
        <p>Loading Focus</p>
      </main>
    );
  if (fundamentals === null)
    return (
      <main className="route-state">
        <p className="eyebrow">Unknown Empire</p>
        <h1>No Focus board exists for “{empireSlug}”.</h1>
        <Link to="/empires">See Empires</Link>
      </main>
    );

  return (
    <main className="focus-page">
      <header className="focus-header">
        <div>
          <p className="eyebrow">[Focus / {empireSlug} / stored corpus]</p>
          <h1>Where to look next</h1>
          <p>
            Compare listed companies in {fundamentals.empireName}. The board uses stored Sectors
            facts as of {fundamentals.asOf}.
          </p>
        </div>
        <Link
          to="/empire/$slug"
          params={{ slug: empireSlug }}
          search={{ ticker: undefined, originKind: undefined, originId: undefined }}
        >
          Open Empire →
        </Link>
      </header>
      <FundamentalBoard board={fundamentals} />
    </main>
  );
}
