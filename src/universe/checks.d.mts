export type CheckDefinition = {
  id: string;
  label: string;
  question: string;
  unit: "percent" | "multiple" | "count";
  formula: string;
  appliesTo: "nonFinancial" | "bank" | "all";
};

export const definitions: readonly CheckDefinition[];
export const financialSubSectors: Set<string>;
export function applies(check: Pick<CheckDefinition, "appliesTo">, company: { subSector: string | null }): boolean;

export function companyCheckData(
  company: {
    symbol: string;
    subSector: string | null;
    current: Record<string, number | null>;
    sourceIds: Record<string, string>;
  },
  years: readonly {
    year: number;
    values: Record<string, number | null>;
    sourceIds: Record<string, string>;
  }[],
  holdings: readonly {
    holderName: string;
    holderKind: string;
    percentage: number | null;
    sourceId: string;
  }[],
  manifest: { groups: readonly { id: string; fields: readonly string[] }[] },
): {
  company: typeof company;
  years: Map<number, (typeof years)[number]>;
  holdings: typeof holdings;
  groups: Map<string, string>;
};

export const CHECKS: readonly (CheckDefinition & {
  compute(data: ReturnType<typeof companyCheckData>, year?: number): {
    period: string;
    value: number | null;
    gap: string | null;
    inputs: {
      key: string;
      field: string;
      period: string;
      value: number | null;
      sourceId: string;
      label?: string;
    }[];
  };
})[];
