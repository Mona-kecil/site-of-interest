import { describe, expect, it } from "vitest";
import { ownerRows, type OwnerSummary } from "./owners-model";

const summary = (key: string, extra: Partial<OwnerSummary> = {}): OwnerSummary => ({
  key,
  name: key,
  kind: "holder",
  listedSymbol: null,
  companyCount: 1,
  totalValue: null,
  largestHolderCount: 0,
  ...extra,
});

describe("owner index", () => {
  const rows = [
    summary("danantara asset management", {
      name: "PT Danantara Asset Management",
      companyCount: 13,
      largestHolderCount: 13,
      totalValue: 20,
    }),
    summary("astra international", {
      name: "PT Astra International Tbk",
      kind: "company",
      listedSymbol: "ASII",
      companyCount: 5,
      largestHolderCount: 5,
      totalValue: 0,
    }),
    summary("afiliasi", { kind: "bucket" }),
  ];

  it("searches canonical names and listed symbols, and limits the listed-owner view", () => {
    expect(ownerRows(rows, " DANANTARA ", false).map(({ key }) => key)).toEqual([
      "danantara asset management",
    ]);
    expect(
      ownerRows(rows, "PT Danantara Asset Management (Persero)", false).map(({ key }) => key),
    ).toEqual(["danantara asset management"]);
    expect(ownerRows(rows, "asii", true).map(({ key }) => key)).toEqual(["astra international"]);
    expect(ownerRows(rows, "", true)).toHaveLength(1);
    expect(ownerRows(rows, "danantara", true)).toHaveLength(0);
  });

  it("defaults to companies held and sorts every column without mutating rows", () => {
    expect(ownerRows(rows, "", false).map(({ companyCount }) => companyCount)).toEqual([13, 5, 1]);
    for (const column of [
      "name",
      "kind",
      "companyCount",
      "totalValue",
      "largestHolderCount",
    ] as const) {
      const sorted = ownerRows(rows, "", false, { column, direction: "asc" });
      expect(sorted.map(({ key }) => key)).toEqual(
        column === "totalValue"
          ? ["astra international", "danantara asset management", "afiliasi"]
          : ["afiliasi", "astra international", "danantara asset management"],
      );
      expect(sorted).not.toBe(rows);
    }
    expect(rows[0].key).toBe("danantara asset management");
    expect(ownerRows(rows, "", false, { column: "name", direction: "asc" })[0].key).toBe(
      "afiliasi",
    );
    expect(
      ownerRows(rows, "", false, { column: "totalValue", direction: "asc" }).map(
        ({ totalValue }) => totalValue,
      ),
    ).toEqual([0, 20, null]);
    expect(
      ownerRows(rows, "", false, { column: "totalValue", direction: "desc" }).map(
        ({ totalValue }) => totalValue,
      ),
    ).toEqual([20, 0, null]);
    expect(ownerRows([summary("z"), summary("a")], "", false).map(({ key }) => key)).toEqual([
      "a",
      "z",
    ]);
  });
});
