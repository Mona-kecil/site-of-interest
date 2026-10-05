import manifest from "../../../data/universe/manifest.json";
import { CHECKS, companyCheckData } from "../../universe/checks.mjs";
import {
  PILLARS,
  companyClassOf,
  judge,
  ratePillar,
  type Outcome,
  type Rule,
} from "../ideas/ideas-model";
import type { CompanyProfile } from "./profile-model";

export const HISTORY_YEARS = [2021, 2022, 2023, 2024, 2025] as const;
export type Reading = {
  key: string;
  value: number | null;
  gap: string | null;
  result: "pass" | "neutral" | "fail" | null;
};
export type YearMark = { year: number; outcome: Outcome; readings: Reading[] };
export type PillarRecord = {
  id: "cash" | "returns" | "balance";
  rules: Rule[];
  years: YearMark[];
};

export function pillarRecords(
  company: Pick<CompanyProfile["company"], "symbol" | "subSector" | "current" | "sourceIds">,
  years: readonly Pick<CompanyProfile["years"][number], "year" | "values" | "sourceIds">[],
): PillarRecord[] {
  const companyClass = companyClassOf(company.subSector);
  const data = companyCheckData(company, years, [], manifest);
  return PILLARS.flatMap((pillar) => {
    if (pillar.id !== "cash" && pillar.id !== "returns" && pillar.id !== "balance") return [];
    const rules = pillar.rules[companyClass].map((rule): Rule =>
      rule.key === "fcf_yield" ? { key: "free_cash_flow", pass: [">", 0] } : rule,
    );
    return [
      {
        id: pillar.id,
        rules,
        years: HISTORY_YEARS.map((year) => {
          const freeCashFlow = data.years.get(year)?.values.freeCashFlow ?? null;
          const readings = rules.map((rule): Reading => {
            const { value, gap } =
              rule.key === "free_cash_flow"
                ? {
                    value: freeCashFlow,
                    gap: freeCashFlow === null ? `Not reported: free_cash_flow[${year}]` : null,
                  }
                : CHECKS.find(({ id }) => id === rule.key)!.compute(data, year);
            return {
              key: rule.key,
              value,
              gap,
              result: value === null ? null : judge(rule, value),
            };
          });
          const evidence = readings.flatMap(({ result }) => (result === null ? [] : [{ result }]));
          return { year, outcome: ratePillar(rules, evidence), readings };
        }),
      },
    ];
  });
}
