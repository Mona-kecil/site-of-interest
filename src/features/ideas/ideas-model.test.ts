import { describe, expect, it } from "vitest";
import snapshot from "../../../data/universe/checks.json";
import companies from "../../../data/universe/companies.json";
import { assess, PILLARS, type PillarId } from "./ideas-model";

function assessment(values: Record<string, number | null> = {}, subSector: string | null = null) {
  return assess({
    subSector,
    peTtm: values.pe_ttm ?? null,
    checks: Object.entries(values).map(([checkId, value]) => ({ checkId, value })),
  });
}

function pillar(
  values: Record<string, number | null>,
  id: PillarId,
  subSector: string | null = null,
) {
  return assessment(values, subSector).pillars.find((item) => item.id === id)!;
}

const passing = {
  cash_conversion: 0.8,
  fcf_yield: 0.05,
  roic: 0.12,
  net_debt_to_ebitda: 2,
  interest_coverage: 4,
  pe_vs_history: 1,
  pe_ttm: 50,
  share_dilution: 0.05,
  dividend_years: 4,
  free_float: 0.1,
};

describe("Ideas assessment", () => {
  it.each([
    ["cash", "cash_conversion", 0.8, "pass", null],
    ["cash", "cash_conversion", 0.5, "neutral", null],
    ["cash", "cash_conversion", 0.499, "fail", null],
    ["cash", "fcf_yield", 0, "neutral", null],
    ["cash", "fcf_yield", 0.001, "pass", null],
    ["returns", "roic", 0.12, "pass", null],
    ["returns", "roic", 0.05, "neutral", null],
    ["returns", "roic", 0.049, "fail", null],
    ["returns", "roe", 0.12, "pass", "Banks"],
    ["returns", "roe", 0.05, "neutral", "Banks"],
    ["returns", "roe", 0.049, "fail", "Insurance"],
    ["balance", "net_debt_to_ebitda", 2, "pass", null],
    ["balance", "net_debt_to_ebitda", 4, "neutral", null],
    ["balance", "net_debt_to_ebitda", 4.001, "fail", null],
    ["balance", "interest_coverage", 4, "pass", null],
    ["balance", "interest_coverage", 1.5, "neutral", null],
    ["balance", "interest_coverage", 1.499, "fail", null],
    ["balance", "npl_ratio", 0.03, "pass", "Banks"],
    ["balance", "npl_ratio", 0.05, "neutral", "Banks"],
    ["balance", "npl_ratio", 0.051, "fail", "Banks"],
    ["balance", "capital_adequacy", 0.18, "pass", "Banks"],
    ["balance", "capital_adequacy", 0.14, "neutral", "Banks"],
    ["balance", "capital_adequacy", 0.139, "fail", "Banks"],
    ["balance", "loan_to_deposit", 0.95, "pass", "Banks"],
    ["balance", "loan_to_deposit", 1.1, "neutral", "Banks"],
    ["balance", "loan_to_deposit", 1.101, "fail", "Banks"],
    ["price", "pe_vs_history", 1, "pass", null],
    ["price", "pe_vs_history", 1.5, "neutral", null],
    ["price", "pe_vs_history", 1.501, "fail", null],
    ["price", "pb_vs_history", 1, "pass", "Banks"],
    ["price", "pb_vs_history", 1.5, "neutral", "Banks"],
    ["price", "pb_vs_history", 1.501, "fail", "Insurance"],
    ["price", "fcf_yield", 0.05, "pass", null],
    ["price", "fcf_yield", 0.049, "neutral", null],
    ["price", "pe_ttm", 50, "pass", null],
    ["price", "pe_ttm", 50.001, "fail", null],
    ["owners", "share_dilution", 0.05, "pass", null],
    ["owners", "share_dilution", 0.25, "neutral", null],
    ["owners", "share_dilution", 0.251, "fail", null],
    ["owners", "dividend_years", 4, "pass", null],
    ["owners", "dividend_years", 3, "neutral", null],
    ["owners", "free_float", 0.1, "pass", null],
    ["owners", "free_float", 0.099, "fail", null],
  ] as const)("%s / %s at %s yields %s", (id, key, value, result, subSector) => {
    expect(pillar({ [key]: value }, id, subSector).evidence).toEqual([{ key, value, result }]);
  });

  it("omits null and absent inputs and distinguishes unknown from non-applicable pillars", () => {
    expect(pillar({ cash_conversion: null }, "cash")).toEqual({
      id: "cash",
      outcome: "unknown",
      evidence: [],
    });
    expect(pillar({}, "cash", "Banks")).toEqual({ id: "cash", outcome: "na", evidence: [] });
    expect(pillar({}, "balance", "Insurance").outcome).toBe("na");
    expect(pillar({}, "balance", "Banks").outcome).toBe("unknown");
    expect(assessment().pillars.map(({ id }) => id)).toEqual(PILLARS.map(({ id }) => id));
  });

  it("uses only reported evidence for pass, mixed and fail outcomes", () => {
    expect(pillar({ cash_conversion: 0.8, fcf_yield: null }, "cash").outcome).toBe("pass");
    expect(pillar({ cash_conversion: 0.8, fcf_yield: 0 }, "cash").outcome).toBe("mixed");
    expect(pillar({ cash_conversion: 0.4, fcf_yield: 0.1 }, "cash").outcome).toBe("fail");
  });

  it("passes fail-only rules when their flag bound is not met", () => {
    expect(pillar({ pe_ttm: 0 }, "price").outcome).toBe("pass");
    expect(pillar({ free_float: 0.2 }, "owners").outcome).toBe("pass");
  });

  it("assigns flags before considering data coverage", () => {
    expect(assessment({ cash_conversion: 0.4 }).verdict).toBe("flags");
  });

  it("assigns thin below three measured pillars", () => {
    expect(assessment().verdict).toBe("thin");
    expect(assessment({ cash_conversion: 0.8, roic: 0.12 }).verdict).toBe("thin");
  });

  it("requires passing core pillars and permits one mixed or unknown pillar for ideas", () => {
    expect(assessment(passing).verdict).toBe("idea");
    expect(assessment({ ...passing, roic: 0.08 }).verdict).toBe("idea");
    expect(assessment({ ...passing, roic: null }).verdict).toBe("idea");
    expect(assessment({ ...passing, cash_conversion: 0.7 }).verdict).toBe("mixed");
    expect(assessment({ ...passing, roic: 0.08, dividend_years: 3 }).verdict).toBe("mixed");
    expect(assessment({ cash_conversion: 0.8, roic: 0.12, net_debt_to_ebitda: 2 }).verdict).toBe(
      "mixed",
    );
  });

  it("uses returns and balance as bank core pillars and excludes cash", () => {
    const values = {
      ...passing,
      roe: 0.12,
      npl_ratio: 0.03,
      capital_adequacy: 0.18,
      loan_to_deposit: 0.95,
      pb_vs_history: 1,
    };
    expect(assessment(values, "Banks").verdict).toBe("idea");
    expect(assessment({ ...values, roe: 0.08 }, "Banks").verdict).toBe("mixed");
  });

  it.each(["Insurance", "Financing Service", "Investment Service"])(
    "never assigns idea to %s",
    (subSector) => {
      const result = assessment({ ...passing, roe: 0.12, pb_vs_history: 1 }, subSector);
      expect(result.verdict).toBe("mixed");
      expect(result.pillars.filter(({ outcome }) => outcome === "pass")).toHaveLength(3);
      expect(result.pillars.find(({ id }) => id === "balance")!.outcome).toBe("na");
    },
  );

  it.each([
    ["TLKM", "idea", null],
    ["BBCA", "idea", null],
    ["DCII", "flags", "price"],
    ["HMSP", "flags", "owners"],
    ["BREN", "flags", "price"],
  ] as const)("assesses stored %s as %s", (symbol, verdict, failingPillar) => {
    const company = companies.find((row) => row.symbol === symbol)!;
    const result = assess({
      subSector: company.subSector,
      peTtm: company.current.peTtm,
      checks: snapshot.results.filter((row) => row.symbol === symbol),
    });
    expect(result.verdict).toBe(verdict);
    if (failingPillar)
      expect(result.pillars.find(({ id }) => id === failingPillar)!.outcome).toBe("fail");
  });
});
