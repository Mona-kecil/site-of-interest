import { describe, expect, it } from "vitest";
import type { EmpireGraph } from "../../domain/empire";
import { calculateLayout, findPath, visibleGraph } from "./graph-model";

const graph: EmpireGraph = {
  manifest: {
    id: "test",
    name: "Test Empire",
    subjectEntityId: "owner",
    jurisdiction: "ID",
    asOf: "2026-09-18",
    status: "researching",
    scope: "test",
    dataPolicy: "sectors_only",
    coverageAreas: ["ownership"],
  },
  entities: [
    {
      id: "owner",
      kind: "person",
      displayName: "Owner",
      country: "Indonesia",
      summary: "Owner",
      ticker: undefined,
      exchange: undefined,
      scopeRole: undefined,
    },
    {
      id: "holding",
      kind: "listed_company",
      displayName: "Holding",
      country: "Indonesia",
      summary: "Holding",
      ticker: "HOLD",
      exchange: "IDX",
      scopeRole: undefined,
    },
    {
      id: "target",
      kind: "listed_company",
      displayName: "Target",
      country: "Indonesia",
      summary: "Target",
      ticker: "TRGT",
      exchange: "IDX",
      scopeRole: undefined,
    },
    {
      id: "outside",
      kind: "private_company",
      displayName: "Outside",
      country: "Indonesia",
      summary: "Outside",
      ticker: undefined,
      exchange: undefined,
      scopeRole: "boundary",
    },
  ],
  relationships: [
    {
      id: "owner-holding",
      from: "owner",
      to: "holding",
      kind: "control",
      directness: "direct",
      control: "controlling",
      scope: "empire",
      status: "reported_position",
      lastVerifiedAt: "2026-09-18",
      metrics: [],
    },
    {
      id: "holding-target",
      from: "holding",
      to: "target",
      kind: "shareholding",
      directness: "direct",
      control: "non_controlling",
      scope: "empire",
      status: "reported_position",
      lastVerifiedAt: "2026-09-18",
      metrics: [],
    },
    {
      id: "outside-target",
      from: "outside",
      to: "target",
      kind: "shareholding",
      directness: "direct",
      control: "non_controlling",
      scope: "boundary",
      status: "reported_position",
      lastVerifiedAt: "2026-09-18",
      metrics: [],
    },
  ],
  assertions: [],
  sources: [],
};

describe("Empire graph model", () => {
  it("keeps outside owners out of the default Empire view", () => {
    const visible = visibleGraph(graph, "empire");
    expect(visible.entities.map((entity) => entity.id)).not.toContain("outside");
    expect(visible.relationships).toHaveLength(2);
  });

  it("finds the evidence path from the subject to a listed descendant", () => {
    const path = findPath(graph, "target");
    expect(path?.entityIds).toEqual(new Set(["target", "holding", "owner"]));
    expect(path?.relationshipIds).toEqual(new Set(["holding-target", "owner-holding"]));
  });

  it("assigns every visible entity a position", () => {
    const visible = visibleGraph(graph, "all");
    const positions = calculateLayout(graph, visible.entities, visible.relationships, 0);
    expect(positions.size).toBe(visible.entities.length);
  });

  it("splits a crowded ownership depth into readable rows", () => {
    const crowdedEntities = Array.from({ length: 13 }, (_, index) => ({
      id: `company-${index}`,
      kind: "private_company",
      displayName: `Company ${index}`,
      country: "Indonesia",
      summary: "Company",
      ticker: undefined,
      exchange: undefined,
      scopeRole: undefined,
    }));
    const crowdedGraph: EmpireGraph = {
      ...graph,
      entities: [graph.entities[0], ...crowdedEntities].filter((entity) => entity !== undefined),
      relationships: crowdedEntities.map((entity, index) => ({
        id: `relationship-${index}`,
        from: "owner",
        to: entity.id,
        kind: "control",
        directness: "direct",
        control: "controlling",
        scope: "empire",
        status: "reported_position",
        lastVerifiedAt: "2026-09-18",
        metrics: [],
      })),
    };
    const positions = calculateLayout(
      crowdedGraph,
      crowdedGraph.entities,
      crowdedGraph.relationships,
      0,
    );
    const companyRows = new Set(crowdedEntities.map((entity) => positions.get(entity.id)?.y));
    expect(companyRows.size).toBe(3);
  });
});
