import { describe, expect, it } from "vitest";
import {
  graphLines,
  ownerRows,
  ownershipGraph,
  type OwnerSummary,
  type Owner,
} from "./owners-model";

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

describe("ownership graph", () => {
  const owner: Pick<Owner, "key" | "name" | "holdings" | "ownHolders"> = {
    key: "asabri",
    name: "PT Asabri (Persero)",
    holdings: Array.from({ length: 11 }, (_, index) => ({
      symbol: `C${String(index).padStart(2, "0")}`,
      reportedName: "PT Asabri (Persero)",
      name: `Company ${index}`,
      percentage: index / 100,
      shares: null,
      value: null,
      rank: 1,
      isLargest: true,
      sourceId: "test",
      subSector: null,
      marketCap: null,
      coHolders: [],
    })),
    ownHolders: [
      {
        key: "parent",
        name: "Parent",
        percentage: 0.6,
        shares: null,
        value: null,
        rank: 1,
        isLargest: true,
        sourceId: "test",
      },
    ],
  };

  it("caps 11 holdings and places upstream holders without overlapping nodes, regardless of input order", () => {
    const graph = ownershipGraph(owner);
    expect(graph).toEqual(ownershipGraph({ ...owner, holdings: [...owner.holdings].reverse() }));
    expect(graph.nodes).toHaveLength(11);
    expect(graph.edges).toHaveLength(9);
    expect(graph.nodes.filter(({ role }) => role === "company").map(({ label }) => label)).toEqual([
      "C10",
      "C09",
      "C08",
      "C07",
      "C06",
      "C05",
      "C04",
      "C03",
    ]);
    expect(graph.nodes.find(({ id }) => id === "more:holdings")).toMatchObject({
      label: "+3 more",
      href: "#owner-holdings",
    });
    for (const [index, a] of graph.nodes.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.x + a.width).toBeLessThanOrEqual(graph.width);
      expect(a.y + a.height).toBeLessThanOrEqual(graph.height);
      for (const b of graph.nodes.slice(index + 1))
        expect(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
        ).toBe(true);
    }
    expect(
      graph.edges.every(
        ({ from, to }) =>
          graph.nodes.some(({ id }) => id === from) && graph.nodes.some(({ id }) => id === to),
      ),
    ).toBe(true);
  });

  it("uses one company node for multiple source rows and preserves percentages, zero and missing values", () => {
    const holdings = [
      owner.holdings[0],
      { ...owner.holdings[0], percentage: null },
      { ...owner.holdings[0], percentage: 0.2 },
    ];
    const graph = ownershipGraph({ ...owner, holdings, ownHolders: [] });
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges[0].percentages).toEqual([0.2, 0, null]);
    expect(graph).toEqual(
      ownershipGraph({ ...owner, holdings: [...holdings].reverse(), ownHolders: [] }),
    );
    expect(ownershipGraph({ ...owner, holdings: [], ownHolders: [] }).nodes).toHaveLength(1);
  });

  it("sorts upstream stakes by largest source row, then name; caps at eight and keeps null last", () => {
    const ownHolders = Array.from({ length: 10 }, (_, index) => ({
      ...owner.ownHolders[0],
      key: `parent${index}`,
      name: `Parent ${index}`,
      percentage: index === 9 ? null : index / 100,
    }));
    ownHolders.push({ ...ownHolders[0], percentage: 0.08 });
    const graph = ownershipGraph({ ...owner, ownHolders });
    expect(graph).toEqual(ownershipGraph({ ...owner, ownHolders: [...ownHolders].reverse() }));
    expect(graph.nodes.filter(({ role }) => role === "upstream").map(({ label }) => label)).toEqual(
      [
        "Parent 0",
        "Parent 8",
        "Parent 7",
        "Parent 6",
        "Parent 5",
        "Parent 4",
        "Parent 3",
        "Parent 2",
      ],
    );
    expect(graph.nodes.find(({ id }) => id === "more:upstream")).toMatchObject({
      label: "+2 more",
      href: "#owner-upstream",
    });
    expect(graph.edges.find(({ id }) => id === "upstream:parent0")?.percentages).toEqual([0.08, 0]);
  });

  it("breaks downstream stake ties by company name and puts zero before null", () => {
    const holdings = [
      { ...owner.holdings[0], symbol: "Z", name: "Alpha", percentage: 0.5 },
      { ...owner.holdings[0], symbol: "A", name: "Zulu", percentage: 0.5 },
      { ...owner.holdings[0], symbol: "N", percentage: null },
      { ...owner.holdings[0], symbol: "O", percentage: 0 },
    ];
    const graph = ownershipGraph({ ...owner, holdings, ownHolders: [] });
    expect(graph.nodes.filter(({ role }) => role === "company").map(({ label }) => label)).toEqual([
      "Z",
      "A",
      "O",
      "N",
    ]);
    expect(graph.nodes.some(({ role }) => role === "more")).toBe(false);
  });

  it("limits visual labels while the graph retains the full name", () => {
    expect(graphLines("ASII")).toEqual(["ASII"]);
    expect(graphLines("PT Danantara Asset Management (Persero)")).toEqual([
      "PT Danantara Asset Management",
      "(Persero)",
    ]);
    expect(graphLines("A".repeat(90))).toEqual(["A".repeat(32), `${"A".repeat(31)}…`]);
  });

  it("retains one upstream node per canonical key with a stable label", () => {
    const ownHolders = [
      owner.ownHolders[0],
      { ...owner.ownHolders[0], name: "PT Parent", percentage: 0.1 },
    ];
    const graph = ownershipGraph({ ...owner, ownHolders });
    expect(graph).toEqual(ownershipGraph({ ...owner, ownHolders: [...ownHolders].reverse() }));
    expect(graph.nodes.filter(({ role }) => role === "upstream")).toHaveLength(1);
  });
});
