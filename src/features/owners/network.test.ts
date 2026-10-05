import { describe, expect, it } from "vitest";
import {
  companyNetwork,
  companyParty,
  groupNetwork,
  labelBox,
  labelLines,
  layoutNetwork,
  ownerNetwork,
  ownerParty,
  pill,
  textWidth,
  type Network,
} from "./network";
import type { Owner } from "./owners-model";

type Holding = Owner["holdings"][number];
type CoHolder = Holding["coHolders"][number];
type CompanyData = Parameters<typeof companyNetwork>[0];
type Group = Parameters<typeof groupNetwork>[0];

const coHolder = (key: string, percentage: number | null): CoHolder => ({
  key,
  name: key,
  percentage,
  shares: null,
  value: null,
  rank: null,
  isLargest: false,
  sourceId: "test",
});

const holding = (
  symbol: string,
  percentage: number | null,
  coHolders: CoHolder[] = [],
): Holding => ({
  symbol,
  reportedName: "Owner",
  name: `${symbol} Tbk`,
  percentage,
  shares: null,
  value: null,
  rank: 1,
  isLargest: true,
  sourceId: "test",
  subSector: null,
  marketCap: null,
  coHolders,
});

const owner = (extra: Partial<Owner> = {}): Owner => ({
  key: "owner",
  name: "Owner",
  kind: "holder",
  listedSymbol: null,
  companyCount: 0,
  totalValue: null,
  holdings: [],
  ownHolders: [],
  ...extra,
});

const ids = (network: Network) => network.branches.map(({ party }) => party.id);

function expectInside(network: Network) {
  const { nodes, viewBox } = layoutNetwork(network);
  const [left, top, width, height] = viewBox;
  for (const node of nodes) {
    expect([node.x, node.y, node.r].every(Number.isFinite)).toBe(true);
    const half =
      node.ring === 0 ? pill(node.lines).width / 2 : Math.max(node.r, textWidth(node.lines) / 2);
    const text = labelLines(node) * 14;
    expect(node.x - half).toBeGreaterThanOrEqual(left);
    expect(node.x + half).toBeLessThanOrEqual(left + width);
    expect(node.y - node.r - (node.above ? text : 0)).toBeGreaterThanOrEqual(top);
    expect(node.y + node.r + (node.above ? 0 : text)).toBeLessThanOrEqual(top + height);
  }
}

describe("network layout", () => {
  it("draws a shared party once and links it to its other company with a cross edge", () => {
    const center = companyParty("AAAA", "A");
    const shared = ownerParty("shared", "PT Shared Tbk");
    const network: Network = {
      center,
      branches: [
        { party: companyParty("BBBB", "B"), side: "down", children: [shared] },
        { party: companyParty("CCCC", "C"), side: "down", children: [shared] },
      ],
      stakes: [
        { owner: shared.id, owned: "company:BBBB", percentage: 0.3 },
        { owner: shared.id, owned: "company:CCCC", percentage: 0.2 },
      ],
    };
    const { nodes, edges } = layoutNetwork(network);
    expect(nodes.filter(({ id }) => id === shared.id)).toHaveLength(1);
    expect(nodes.find(({ id }) => id === shared.id)?.lines).toEqual(["Shared"]);
    expect(edges.filter(({ kind }) => kind === "cross")).toEqual([
      expect.objectContaining({ id: "owner:shared>company:CCCC", percentage: 0.2 }),
    ]);
  });

  it("keeps every dot and name inside the drawing, from a lone center to a crowded group", () => {
    const center = ownerParty("center", "PT A Very Long Holding Company Name Indonesia");
    expectInside({ center, branches: [], stakes: [] });
    const branches = Array.from({ length: 24 }, (_, index) => ({
      party: companyParty(`M${index}`, null),
      side: index % 3 ? ("down" as const) : ("up" as const),
      children: [0, 1].map((child) =>
        ownerParty(`h${index}-${child}`, `Holder Number ${index} ${child} Investama`),
      ),
    }));
    expectInside({ center, branches, stakes: [] });
    expectInside({
      center,
      branches: branches.map((branch) => ({ ...branch, side: "down" })),
      stakes: [],
    });
  });

  it("keeps names in a crowded drawing from touching each other", () => {
    const branches = Array.from({ length: 24 }, (_, index) => ({
      party: companyParty(`M${index}`, null),
      side: "down" as const,
      children: [0, 1].map((child) =>
        ownerParty(`h${index}-${child}`, `Holder Number ${index} ${child} Investama`),
      ),
    }));
    const { nodes } = layoutNetwork({ center: companyParty("SALIM", null), branches, stakes: [] });
    const boxes = nodes.map(labelBox);
    const touching = boxes.flatMap((a, i) =>
      boxes
        .slice(i + 1)
        .filter((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
        .map((_, j) => [nodes[i].id, nodes[i + 1 + j].id]),
    );
    expect(touching).toEqual([]);
  });
});

describe("company network", () => {
  const data = (extra: Partial<CompanyData> = {}): CompanyData => ({
    symbol: "AAAA",
    name: "PT A Tbk",
    holders: [],
    holdings: [],
    holdingCount: 0,
    ownerKey: null,
    ...extra,
  });
  const holder = (
    key: string,
    percentage: number | null,
    extra = {},
  ): CompanyData["holders"][number] => ({
    key,
    name: key,
    kind: "holder",
    listedSymbol: null,
    percentage,
    others: [{ symbol: `${key.toUpperCase()}X`, name: null, percentage: 0.5 }],
    otherCount: 3,
    ...extra,
  });

  it("shows shareholders of at least 1% above, with their other companies, and pooled accounts unexpanded", () => {
    const network = companyNetwork(
      data({
        holders: [
          holder("big", 0.4),
          holder("pool", 0.2, { kind: "bucket" }),
          holder("listed", 0.1, { listedSymbol: "LLLL" }),
          holder("small", 0.009),
          holder("unknown", null),
        ],
      }),
    );
    expect(ids(network)).toEqual(["owner:big", "owner:pool", "company:LLLL"]);
    const [big, pool] = network.branches;
    expect(big.side).toBe("up");
    expect(big.children.map(({ id, label, href }) => [id, label, href])).toEqual([
      ["company:BIGX", "BIGX", "/company/BIGX"],
      ["more:owner:big", "+2 more", "/owner/big"],
    ]);
    expect(pool.party.tone).toBe("pooled");
    expect(pool.children).toEqual([]);
  });

  it("puts its holdings below and links the rest to its owner page", () => {
    const network = companyNetwork(
      data({
        holdings: [{ symbol: "SUBS", name: "Sub", percentage: 0.6 }],
        holdingCount: 3,
        ownerKey: "a company",
      }),
    );
    expect(network.branches.map(({ party, side }) => [party.label, side, party.href])).toEqual([
      ["SUBS", "down", "/company/SUBS"],
      ["+2 more", "down", "/owner/a%20company"],
    ]);
    expect(network.stakes).toContainEqual({
      owner: "company:AAAA",
      owned: "company:SUBS",
      percentage: 0.6,
    });
  });
});

describe("owner network", () => {
  it("keeps one dot per company at its largest stake and expands only co-holders of at least 1%", () => {
    const network = ownerNetwork(
      owner({
        holdings: [
          holding("BBBB", 0.05),
          holding("CCCC", 0.3, [
            coHolder("other", 0.2),
            coHolder("tiny", 0.001),
            coHolder("gone", null),
          ]),
          holding("BBBB", 0.4),
        ],
      }),
    );
    expect(ids(network)).toEqual(["company:BBBB", "company:CCCC"]);
    expect(network.stakes).toContainEqual({
      owner: "owner:owner",
      owned: "company:BBBB",
      percentage: 0.4,
    });
    expect(network.branches[1].children.map(({ id }) => id)).toEqual(["owner:other"]);
  });

  it("centers a listed owner on its symbol with its own shareholders above and caps the holdings", () => {
    const network = ownerNetwork(
      owner({
        listedSymbol: "OWNR",
        ownHolders: [{ ...coHolder("parent", 0.5) }, { ...coHolder("dust", 0.005) }],
        holdings: Array.from({ length: 10 }, (_, index) =>
          holding(`H${index}`, (10 - index) / 100),
        ),
      }),
    );
    expect(network.center.id).toBe("company:OWNR");
    const up = network.branches.filter(({ side }) => side === "up");
    expect(up.map(({ party }) => party.id)).toEqual(["owner:parent"]);
    const down = network.branches.filter(({ side }) => side === "down");
    expect(down).toHaveLength(9);
    expect(down.at(-1)?.party).toMatchObject({ label: "+2 more", href: "#owner-holdings" });
  });
});

describe("group network", () => {
  const member = (
    symbol: string,
    marketCap: number | null,
    holders: Group["members"][number]["holders"],
  ) => ({
    symbol,
    name: `${symbol} Tbk`,
    subSector: null,
    marketCap,
    freeFloat: null,
    checks: [],
    holders,
  });

  it("orders members by market cap and links a member that owns another instead of repeating it", () => {
    const group: Group = {
      slug: "salim",
      label: "Salim",
      symbols: ["INDF", "ICBP"],
      totalMarketCap: null,
      members: [
        member("ICBP", 100, [
          {
            key: "indf",
            name: "PT Indofood Sukses Makmur Tbk",
            listedSymbol: "INDF",
            percentage: 0.8,
          },
          { key: "a", name: "A", listedSymbol: null, percentage: 0.05 },
          { key: "b", name: "B", listedSymbol: null, percentage: 0.04 },
          { key: "c", name: "C", listedSymbol: null, percentage: 0.03 },
        ]),
        member("INDF", 200, [{ key: "a", name: "A", listedSymbol: null, percentage: 0.5 }]),
      ],
    };
    const network = groupNetwork(group);
    expect(network.center).toMatchObject({ label: "Salim", href: "/group/salim" });
    expect(ids(network)).toEqual(["company:INDF", "company:ICBP"]);
    expect(network.branches[1].children.map(({ id }) => id)).toEqual(["owner:a", "owner:b"]);
    const cross = layoutNetwork(network).edges.filter(({ kind }) => kind === "cross");
    expect(cross.map(({ id, percentage }) => [id, percentage])).toEqual([
      ["company:INDF>company:ICBP", 0.8],
      ["owner:a>company:ICBP", 0.05],
    ]);
  });
});
