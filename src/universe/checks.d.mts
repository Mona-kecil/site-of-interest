export type CheckDefinition = {
  id: string;
  label: string;
  question: string;
  unit: "percent" | "multiple" | "count";
  formula: string;
  appliesTo: "nonFinancial" | "bank" | "all";
};

export const definitions: readonly CheckDefinition[];
