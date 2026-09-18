import type {
  EmpireEntity,
  EmpireGraph,
  EmpireRelationship,
  EmpireView,
  GraphPosition,
  GraphSelection,
} from "../../domain/empire";

const ownershipKinds = new Set([
  "control",
  "shareholding",
  "portfolio_investment",
  "group_affiliation",
  "group_membership",
]);

export function relationshipMatchesView(
  relationship: EmpireRelationship,
  view: EmpireView,
): boolean {
  if (view === "empire") return relationship.scope !== "boundary";
  if (view === "control") return relationship.control === "controlling";
  if (view === "minority") return relationship.control === "non_controlling";
  return true;
}

export function visibleGraph(
  graph: EmpireGraph,
  view: EmpireView,
): { entities: EmpireEntity[]; relationships: EmpireRelationship[] } {
  const relationships = graph.relationships.filter((relationship) =>
    relationshipMatchesView(relationship, view),
  );
  const entityIds = new Set([graph.manifest.subjectEntityId]);
  for (const relationship of relationships) {
    entityIds.add(relationship.from);
    entityIds.add(relationship.to);
  }

  return {
    entities: graph.entities.filter((entity) => entityIds.has(entity.id)),
    relationships,
  };
}

export function calculateLayout(
  graph: EmpireGraph,
  entities: readonly EmpireEntity[],
  relationships: readonly EmpireRelationship[],
  reflow: number,
): Map<string, GraphPosition> {
  const visibleIds = new Set(entities.map((entity) => entity.id));
  const depthById = new Map([[graph.manifest.subjectEntityId, 0]]);
  const queue = [graph.manifest.subjectEntityId];

  while (queue.length > 0) {
    const from = queue.shift();
    if (from === undefined) break;
    const currentDepth = depthById.get(from);
    if (currentDepth === undefined) continue;

    for (const relationship of relationships) {
      if (
        relationship.from !== from ||
        relationship.status === "historical" ||
        !ownershipKinds.has(relationship.kind) ||
        !visibleIds.has(relationship.to) ||
        depthById.has(relationship.to)
      ) {
        continue;
      }
      depthById.set(relationship.to, currentDepth + 1);
      queue.push(relationship.to);
    }
  }

  const maxDepth = Math.max(0, ...depthById.values());
  for (const entity of entities) {
    if (!depthById.has(entity.id)) depthById.set(entity.id, maxDepth + 1);
  }

  const rows = new Map<number, EmpireEntity[]>();
  for (const entity of entities) {
    const depth = depthById.get(entity.id) ?? maxDepth + 1;
    const row = rows.get(depth) ?? [];
    row.push(entity);
    rows.set(depth, row);
  }

  const positions = new Map<string, GraphPosition>();
  const orderedRows = [...rows.entries()].sort(([left], [right]) => left - right);
  const visualRows = orderedRows.flatMap(([, row]) => {
    const sorted = [...row].sort((left, right) => left.id.localeCompare(right.id));
    const offset = sorted.length > 1 ? reflow % sorted.length : 0;
    const shifted = [...sorted.slice(offset), ...sorted.slice(0, offset)];
    const chunks: EmpireEntity[][] = [];
    for (let index = 0; index < shifted.length; index += 6) {
      chunks.push(shifted.slice(index, index + 6));
    }
    return chunks;
  });

  visualRows.forEach((row, rowIndex) => {
    row.forEach((entity, columnIndex) => {
      positions.set(entity.id, {
        x: ((columnIndex + 1) / (row.length + 1)) * 100,
        y: 7 + (rowIndex / Math.max(visualRows.length - 1, 1)) * 82,
      });
    });
  });

  return positions;
}

export function findPath(graph: EmpireGraph, destinationId: string): GraphSelection | null {
  const startId = graph.manifest.subjectEntityId;
  const queue = [startId];
  const previous = new Map<string, EmpireRelationship>();
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (current === destinationId) break;

    for (const relationship of graph.relationships) {
      if (
        relationship.from !== current ||
        relationship.status === "historical" ||
        !ownershipKinds.has(relationship.kind) ||
        visited.has(relationship.to)
      ) {
        continue;
      }
      visited.add(relationship.to);
      previous.set(relationship.to, relationship);
      queue.push(relationship.to);
    }
  }

  if (!visited.has(destinationId)) return null;

  const relationshipIds = new Set<string>();
  const entityIds = new Set([destinationId]);
  let cursor = destinationId;
  while (cursor !== startId) {
    const relationship = previous.get(cursor);
    if (relationship === undefined) return null;
    relationshipIds.add(relationship.id);
    entityIds.add(relationship.from);
    cursor = relationship.from;
  }

  return { entityIds, relationshipIds };
}

export function relationshipLabel(relationship: EmpireRelationship): string {
  const ownership = relationship.metrics.find((metric) => metric.kind === "ownership_percent");
  if (ownership !== undefined) return `${ownership.value}%`;
  if (relationship.kind === "group_membership") return "group member";
  if (relationship.kind === "group_affiliation") return "inferred link";
  return relationship.kind.replaceAll("_", " ");
}
