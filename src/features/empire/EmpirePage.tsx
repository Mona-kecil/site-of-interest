import { useQuery } from "convex/react";
import { getRouteApi } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { EmpireWorkspace } from "./EmpireWorkspace";

const route = getRouteApi("/empire/$slug");

export function EmpirePage() {
  const { slug } = route.useParams();
  const { ticker, originKind, originId } = route.useSearch();
  const empire = useQuery(api.empires.getBySlug, { slug });

  if (empire === undefined) {
    return (
      <main className="route-state">
        <span className="loading-orbit" />
        <p>Loading the Empire corpus</p>
      </main>
    );
  }

  if (empire === null) {
    return (
      <main className="route-state">
        <p className="eyebrow">Unknown Empire</p>
        <h1>No corpus exists for “{slug}”.</h1>
      </main>
    );
  }

  const initialEntityId = ticker
    ? empire.entities.find((entity) => entity.ticker === ticker)?.id
    : undefined;
  return (
    <EmpireWorkspace
      key={`${slug}:${initialEntityId ?? "root"}`}
      graph={empire}
      empireSlug={slug}
      initialEntityId={initialEntityId}
      origin={originKind && originId ? { kind: originKind, id: originId } : undefined}
    />
  );
}
