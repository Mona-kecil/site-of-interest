import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";

export type EmpireGraph = NonNullable<FunctionReturnType<typeof api.empires.getBySlug>>;
export type EmpireEntity = EmpireGraph["entities"][number];
export type EmpireRelationship = EmpireGraph["relationships"][number];
export type RelationshipAssertion = EmpireGraph["assertions"][number];

export type EmpireView = "empire" | "all" | "control" | "minority";

export interface GraphPosition {
  x: number;
  y: number;
}

export interface GraphSelection {
  entityIds: ReadonlySet<string>;
  relationshipIds: ReadonlySet<string>;
}
