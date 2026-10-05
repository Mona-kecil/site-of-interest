import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { formatValue } from "../../universe/presentation.mjs";
import {
  labelBox,
  labelLines,
  layoutNetwork,
  pill,
  type Network,
  type Party,
  type PlacedEdge,
  type PlacedNode,
} from "./network";

const legend: Record<Exclude<Party["tone"], "more">, string> = {
  listed: "Listed company",
  holder: "Other shareholder",
  pooled: "Pooled or custodian account",
};

export function NetworkGraph({
  network,
  label,
  children,
}: {
  network: Network;
  label: string;
  children: ReactNode;
}) {
  const { nodes, edges, viewBox } = layoutNetwork(network);
  const [left, , width, height] = viewBox;
  const router = useRouter();
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = scroll.current;
    if (box) box.scrollLeft = (-left / width) * box.scrollWidth - box.clientWidth / 2;
  }, [network.center.id, left, width]);
  const open = (event: MouseEvent, href: string) => {
    if (!href.startsWith("/") || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    router.history.push(href);
  };
  const tones = [...new Set(nodes.map(({ tone }) => tone))].filter((tone) => tone !== "more");
  const [heldBy, holds] = (["up", "down"] as const).map((side) => {
    const branches = network.branches.filter((branch) => branch.side === side);
    if (!branches.length) return null;
    const heading = side === "up" ? "Held by" : "Holds";
    return (
      <section key={side} aria-label={heading}>
        <h3>{heading}</h3>
        <ul>
          {branches.map(({ party }) => {
            const stake =
              nodes.find(({ id, ring }) => ring === 1 && id === party.id)?.stake ?? null;
            return (
              <li key={party.id}>
                <a href={party.href} onClick={(event) => open(event, party.href)}>
                  <span>
                    <strong>{party.label}</strong>
                    {party.tone !== "more" && party.name !== party.label && (
                      <small>{party.name}</small>
                    )}
                  </span>
                  {stake !== null && (
                    <span className="network-relation-stake">{formatValue(stake, "percent")}</span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    );
  });
  return (
    <figure className="network" data-tour="network">
      <div className="network-relations">
        {heldBy}
        {heldBy && (
          <span className="network-arrow" aria-hidden="true">
            ↓
          </span>
        )}
        <a
          className="network-center"
          href={network.center.href}
          onClick={(event) => open(event, network.center.href)}
        >
          <strong>{network.center.label}</strong>
          {network.center.name !== network.center.label && <small>{network.center.name}</small>}
        </a>
        {holds && (
          <span className="network-arrow" aria-hidden="true">
            ↓
          </span>
        )}
        {holds}
      </div>
      <div className="network-scroll" ref={scroll} role="region" aria-label={label} tabIndex={0}>
        <svg viewBox={viewBox.join(" ")} width={width} height={height} aria-label={label}>
          {edges.map((edge) => (
            <path
              key={edge.id}
              className={`network-edge network-edge-${edge.kind}`}
              d={curve(edge).d}
            >
              {edge.kind === "cross" && edge.percentage !== null && (
                <title>
                  {edge.from.name} owns {formatValue(edge.percentage, "percent")} of {edge.to.name}
                </title>
              )}
            </path>
          ))}
          {edges
            .filter(({ kind, percentage }) => kind === "cross" && percentage !== null)
            .filter((edge) => !covers(nodes, curve(edge).label))
            .map((edge) => (
              <text
                key={edge.id}
                className="network-cross"
                {...curve(edge).label}
                textAnchor="middle"
              >
                {formatValue(edge.percentage, "percent")}
              </text>
            ))}
          {nodes.map((node) => (
            <a
              key={node.id}
              href={node.href}
              className={`network-node network-${node.tone} network-ring-${node.ring}`}
              onClick={(event) => open(event, node.href)}
            >
              <title>
                {node.name}
                {node.ring > 0 && node.stake !== null && `, ${formatValue(node.stake, "percent")}`}
              </title>
              {node.ring === 0 ? (
                <rect
                  x={-pill(node.lines).width / 2}
                  y={-pill(node.lines).height / 2}
                  {...pill(node.lines)}
                  rx="6"
                />
              ) : (
                node.r > 0 && <circle cx={node.x} cy={node.y} r={node.r} />
              )}
              <text
                x={node.x}
                y={
                  node.ring === 0
                    ? -(node.lines.length - 1) * 7 + 5
                    : node.above
                      ? node.y - node.r - 8 - (labelLines(node) - 1) * 14
                      : node.y + node.r + 14
                }
                textAnchor="middle"
              >
                {node.lines.map((line, index) => (
                  <tspan key={index} x={node.x} dy={index ? (node.ring === 0 ? 15 : 14) : 0}>
                    {line}
                  </tspan>
                ))}
                {node.ring === 1 && node.stake !== null && (
                  <tspan className="network-stake" x={node.x} dy={14}>
                    {formatValue(node.stake, "percent")}
                  </tspan>
                )}
              </text>
            </a>
          ))}
        </svg>
      </div>
      <figcaption>
        {children}
        <span className="network-legend">
          {tones.map((tone) => (
            <span key={tone} className={`network-key network-${tone}`}>
              {legend[tone as keyof typeof legend]}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}

// A link's percentage is left to its tooltip when it would sit on a dot or a name.
function covers(nodes: PlacedNode[], { x, y }: { x: number; y: number }) {
  return nodes.some((node) => {
    const box = labelBox(node);
    return x > box.left - 22 && x < box.right + 22 && y > box.top - 10 && y < box.bottom + 4;
  });
}

// Cross links bow away from the center so they don't run through it.
function curve({ from, to, kind }: PlacedEdge) {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const [dx, dy] = [(to.x - from.x) / length, (to.y - from.y) / length];
  const start = [from.x + dx * from.r, from.y + dy * from.r];
  const end = [to.x - dx * to.r, to.y - dy * to.r];
  const middle = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
  if (kind !== "cross") return { d: `M ${start} L ${end}`, label: { x: middle[0], y: middle[1] } };
  const away = Math.sign(middle[0] * -dy + middle[1] * dx) || 1;
  const bend = Math.max(60, length * 0.35) * away;
  const control = [middle[0] - dy * bend, middle[1] + dx * bend];
  return {
    d: `M ${start} Q ${control} ${end}`,
    label: { x: (middle[0] + control[0]) / 2, y: (middle[1] + control[1]) / 2 + 4 },
  };
}
