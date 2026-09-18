import { useQuery } from "convex/react";
import { getRouteApi } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { EmpireWorkspace } from "./EmpireWorkspace";

const route = getRouteApi("/empire/$slug");

export function EmpirePage() {
  const { slug } = route.useParams();
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

  return <EmpireWorkspace graph={empire} />;
}
