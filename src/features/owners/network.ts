import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { isCustodianName } from "../../universe/owners.mjs";
import type { Owner } from "./owners-model";

export type Party = {
  id: string;
  label: string;
  name: string;
  href: string;
  tone: "listed" | "holder" | "pooled" | "more";
};
export type Stake = { owner: string; owned: string; percentage: number | null };
type Branch = { party: Party; side: "up" | "down"; children: Party[] };
export type Network = { center: Party; branches: Branch[]; stakes: Stake[] };

export type PlacedNode = Party & {
  ring: 0 | 1 | 2;
  x: number;
  y: number;
  r: number;
  lines: string[];
  stake: number | null;
  above: boolean;
};
export type PlacedEdge = {
  id: string;
  from: PlacedNode;
  to: PlacedNode;
  percentage: number | null;
  kind: "main" | "branch" | "cross";
};

export function shortName(name: string) {
  return name
    .replace(/^\s*PT\.?\s+/i, "")
    .replace(/\s*\(Persero\)/i, "")
    .replace(/,?\s+Tbk\.?\s*$/i, "")
    .trim();
}

export function companyParty(symbol: string, name: string | null): Party {
  return {
    id: `company:${symbol}`,
    label: symbol,
    name: name ?? symbol,
    href: `/company/${encodeURIComponent(symbol)}`,
    tone: "listed",
  };
}

export function ownerParty(key: string, name: string, pooled = false): Party {
  return {
    id: `owner:${key}`,
    label: shortName(name),
    name,
    href: `/owner/${encodeURIComponent(key)}`,
    tone: pooled ? "pooled" : "holder",
  };
}

function moreParty(id: string, count: number, href: string): Party {
  return { id: `more:${id}`, label: `+${count} more`, name: `${count} more`, href, tone: "more" };
}

export const labelLines = (node: PlacedNode) =>
  node.lines.length + Number(node.ring === 1 && node.stake !== null);

// The space a node's dot and name take up, its name above or below the dot.
export function labelBox(node: PlacedNode) {
  if (node.ring === 0) {
    const { width, height } = pill(node.lines);
    return { left: -width / 2, right: width / 2, top: -height / 2, bottom: height / 2 };
  }
  const half = Math.max(node.r, textWidth(node.lines) / 2);
  const text = 12 + labelLines(node) * 14;
  return {
    left: node.x - half,
    right: node.x + half,
    top: node.y - node.r - (node.above ? text : 0),
    bottom: node.y + node.r + (node.above ? 0 : text),
  };
}

type Box = ReturnType<typeof labelBox>;
const overlaps = (a: Box, b: Box, gap: number) =>
  a.left < b.right + gap &&
  b.left < a.right + gap &&
  a.top < b.bottom + gap &&
  b.top < a.bottom + gap;

function wrapLabel(label: string, width = 18) {
  const lines: string[] = [];
  for (const word of label.split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= width)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word.length > width ? `${word.slice(0, width - 1)}…` : word);
  }
  return lines.length > 2 ? [lines[0], `${lines[1].slice(0, width - 1)}…`] : lines;
}

const slot = 124;
const ringGap = 128;
const minOuter = 236;
export const textWidth = (lines: string[]) => Math.max(...lines.map((line) => line.length)) * 6.6;
export const pill = (lines: string[]) => ({
  width: textWidth(lines) + 28,
  height: lines.length * 16 + 18,
});

// Branches fan out from the center, the owners above and the holdings below, and each branch
// keeps a wedge wide enough for its children's labels. A party appears once; repeat links
// become cross edges.
export function layoutNetwork({ center, branches, stakes }: Network) {
  const taken = new Set([center.id, ...branches.map(({ party }) => party.id)]);
  const tree = branches.map((branch) => ({
    ...branch,
    children: branch.children.filter(({ id }) => !taken.has(id) && Boolean(taken.add(id))),
  }));
  const stakeOf = (a: string, b: string) =>
    stakes.find(({ owner, owned }) => (owner === a && owned === b) || (owner === b && owned === a))
      ?.percentage ?? null;
  const size = (base: number, scale: number, stake: number | null) =>
    base + scale * Math.sqrt(Math.min(Math.max(stake ?? 0, 0), 1));
  const nodes: PlacedNode[] = [
    {
      ...center,
      ring: 0,
      x: 0,
      y: 0,
      r: 0,
      lines: wrapLabel(center.label, 22),
      stake: null,
      above: false,
    },
  ];
  const { width, height } = pill(nodes[0].lines);
  const clearance = (angle: number) =>
    Math.min(width / 2 / Math.abs(Math.cos(angle)), height / 2 / Math.abs(Math.sin(angle)));
  const edges: PlacedEdge[] = [];
  const link = (from: PlacedNode, to: PlacedNode, kind: PlacedEdge["kind"]) => {
    if (to.tone !== "more")
      edges.push({ id: `${from.id}>${to.id}`, from, to, percentage: to.stake, kind });
  };
  const sides = (["up", "down"] as const).map((side) => tree.filter((b) => b.side === side));
  sides.forEach((group, index) => {
    if (!group.length) return;
    const span = ((sides[1 - index].length ? 150 : 330) * Math.PI) / 180;
    const weights = group.map(({ children }) => Math.max(1, children.length));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const hasChildren = group.some(({ children }) => children.length);
    const loose = Math.max(minOuter, (slot * total) / span);
    const stagger = hasChildren && loose > minOuter * 1.5;
    const outer = stagger ? Math.max(minOuter * 1.5, (slot * total) / (2 * span)) : loose;
    const inner = hasChildren ? outer - ringGap : outer - 60;
    const step = Math.min(span / total, slot / outer);
    let angle = (index === 0 ? -Math.PI / 2 : Math.PI / 2) - (step * total) / 2;
    let previous: PlacedNode | undefined;
    let count = 0;
    group.forEach(({ party, children }, branchIndex) => {
      const middle = angle + (weights[branchIndex] * step) / 2;
      const lines = wrapLabel(party.label);
      const crowded =
        previous?.ring === 1 &&
        Math.hypot(previous.x - inner * Math.cos(middle), previous.y - inner * Math.sin(middle)) <
          (textWidth(previous.lines) + textWidth(lines)) / 2 + 8 &&
        Math.hypot(previous.x, previous.y) <= inner;
      const stake = stakeOf(party.id, center.id);
      const r = party.tone === "more" ? 0 : size(7, 13, stake);
      const above = !children.length && Math.sin(middle) < -0.2;
      const inward =
        !above && Math.sin(middle) < 0 ? (lines.length + Number(stake !== null)) * 14 + 8 : 0;
      const radius = Math.max(crowded ? inner + 40 : inner, clearance(middle) + r + 32 + inward);
      const branch: PlacedNode = {
        ...party,
        ring: 1,
        x: radius * Math.cos(middle),
        y: radius * Math.sin(middle),
        r,
        lines,
        stake,
        above,
      };
      nodes.push(branch);
      link(nodes[0], branch, "main");
      previous = branch;
      children.forEach((item, childIndex) => {
        const at = angle + (childIndex + 0.5) * step;
        const reach = outer + (stagger && count++ % 2 ? 44 : 0);
        const childStake = stakeOf(party.id, item.id);
        const node: PlacedNode = {
          ...item,
          ring: 2,
          x: reach * Math.cos(at),
          y: reach * Math.sin(at),
          r: item.tone === "more" ? 0 : size(5, 9, childStake),
          lines: wrapLabel(item.label),
          stake: childStake,
          above: Math.sin(at) < -0.2,
        };
        nodes.push(node);
        link(branch, node, "branch");
      });
      angle += weights[branchIndex] * step;
    });
  });

  // An outer name that would touch another moves out along its spoke.
  const settled = nodes.filter(({ ring }) => ring < 2).map(labelBox);
  for (const node of nodes.filter(({ ring }) => ring === 2)) {
    const length = Math.hypot(node.x, node.y);
    for (
      let push = 0;
      push < 8 && settled.some((box) => overlaps(labelBox(node), box, 6));
      push++
    ) {
      node.x += (16 * node.x) / length;
      node.y += (16 * node.y) / length;
    }
    settled.push(labelBox(node));
  }

  const placed = new Map(nodes.map((node) => [node.id, node]));
  const pairs = new Set(edges.map(({ from, to }) => [from.id, to.id].sort().join(" ")));
  for (const { owner, owned, percentage } of stakes) {
    const from = placed.get(owner);
    const to = placed.get(owned);
    const pair = [owner, owned].sort().join(" ");
    if (!from || !to || pairs.has(pair)) continue;
    pairs.add(pair);
    edges.push({ id: `${owner}>${owned}`, from, to, percentage, kind: "cross" });
  }

  const box = nodes.map(labelBox).reduce((bounds, next) => ({
    left: Math.min(bounds.left, next.left),
    right: Math.max(bounds.right, next.right),
    top: Math.min(bounds.top, next.top),
    bottom: Math.max(bounds.bottom, next.bottom),
  }));
  const pad = 20;
  return {
    nodes,
    edges,
    viewBox: [
      box.left - pad,
      box.top - pad,
      box.right - box.left + 2 * pad,
      box.bottom - box.top + 2 * pad,
    ] as const,
  };
}

type CompanyNetwork = NonNullable<FunctionReturnType<typeof api.companyNetwork.get>>;
type Group = NonNullable<FunctionReturnType<typeof api.owners.group>>;
const meaningful = (percentage: number | null) => (percentage ?? 0) >= 0.01;
const ownerHref = (key: string) => `/owner/${encodeURIComponent(key)}`;

// Shareholders of at least 1% above, with the other companies they hold; this company's own
// holdings below. Pooled and custodian accounts are not expanded.
export function companyNetwork(data: CompanyNetwork): Network {
  const center = companyParty(data.symbol, data.name);
  const stakes: Stake[] = [];
  const up = data.holders
    .filter(({ percentage }) => meaningful(percentage))
    .slice(0, 8)
    .map((holder): Branch => {
      const pooled = holder.kind === "bucket" || isCustodianName(holder.name);
      const party = holder.listedSymbol
        ? companyParty(holder.listedSymbol, holder.name)
        : ownerParty(holder.key, holder.name, pooled);
      stakes.push({ owner: party.id, owned: center.id, percentage: holder.percentage });
      if (pooled) return { party, side: "up", children: [] };
      const children = holder.others.map((other) => {
        const child = companyParty(other.symbol, other.name);
        stakes.push({ owner: party.id, owned: child.id, percentage: other.percentage });
        return child;
      });
      const hidden = holder.otherCount - holder.others.length;
      if (hidden > 0) children.push(moreParty(party.id, hidden, ownerHref(holder.key)));
      return { party, side: "up", children };
    });
  const down = data.holdings.map((holding): Branch => {
    const party = companyParty(holding.symbol, holding.name);
    stakes.push({ owner: center.id, owned: party.id, percentage: holding.percentage });
    return { party, side: "down", children: [] };
  });
  const hidden = data.holdingCount - data.holdings.length;
  if (hidden > 0 && data.ownerKey)
    down.push({
      party: moreParty("holdings", hidden, ownerHref(data.ownerKey)),
      side: "down",
      children: [],
    });
  return { center, branches: [...up, ...down], stakes };
}

// The owner in the middle, the companies it holds around it, and each company's other
// shareholders of at least 1% beyond. A listed owner's own shareholders sit above.
export function ownerNetwork(owner: Owner): Network {
  const pooled = owner.kind === "bucket" || isCustodianName(owner.name);
  const center = owner.listedSymbol
    ? companyParty(owner.listedSymbol, owner.name)
    : ownerParty(owner.key, owner.name, pooled);
  const stakes: Stake[] = [];
  const up = owner.ownHolders
    .filter(({ percentage }) => meaningful(percentage))
    .slice(0, 6)
    .map((holder): Branch => {
      const party = ownerParty(holder.key, holder.name, isCustodianName(holder.name));
      stakes.push({ owner: party.id, owned: center.id, percentage: holder.percentage });
      return { party, side: "up", children: [] };
    });
  const largest = new Map<string, Owner["holdings"][number]>();
  for (const holding of owner.holdings) {
    const seen = largest.get(holding.symbol);
    if (!seen || (holding.percentage ?? -1) > (seen.percentage ?? -1))
      largest.set(holding.symbol, holding);
  }
  const holdings = [...largest.values()].sort(
    (a, b) => (b.percentage ?? -1) - (a.percentage ?? -1) || a.symbol.localeCompare(b.symbol),
  );
  const down = holdings.slice(0, 8).map((holding): Branch => {
    const party = companyParty(holding.symbol, holding.name);
    stakes.push({ owner: center.id, owned: party.id, percentage: holding.percentage });
    const children = holding.coHolders
      .filter(({ percentage }) => meaningful(percentage))
      .slice(0, 3)
      .map((holder) => {
        const child = ownerParty(holder.key, holder.name, isCustodianName(holder.name));
        stakes.push({ owner: child.id, owned: party.id, percentage: holder.percentage });
        return child;
      });
    return { party, side: "down", children };
  });
  if (holdings.length > 8)
    down.push({
      party: moreParty("holdings", holdings.length - 8, "#owner-holdings"),
      side: "down",
      children: [],
    });
  return { center, branches: [...up, ...down], stakes };
}

// Members around the group's name, each with up to two of its largest shareholders. A
// shareholder of several members, or a member holding another, shows as a link between them.
export function groupNetwork(group: Group): Network {
  const center: Party = {
    id: `group:${group.slug}`,
    label: group.label,
    name: `${group.label} group`,
    href: `/group/${encodeURIComponent(group.slug)}`,
    tone: "holder",
  };
  const stakes: Stake[] = [];
  const branches = [...group.members]
    .sort((a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1) || a.symbol.localeCompare(b.symbol))
    .map((member): Branch => {
      const party = companyParty(member.symbol, member.name);
      const children = member.holders.map((holder) => {
        const owner = holder.listedSymbol
          ? companyParty(holder.listedSymbol, holder.name)
          : ownerParty(holder.key, holder.name, isCustodianName(holder.name));
        stakes.push({ owner: owner.id, owned: party.id, percentage: holder.percentage });
        return owner;
      });
      return {
        party,
        side: "down",
        children: children
          .filter(({ id }) => !group.symbols.some((symbol) => id === `company:${symbol}`))
          .slice(0, 2),
      };
    });
  return { center, branches, stakes };
}
