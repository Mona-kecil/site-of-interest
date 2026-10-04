import { useEffect, useRef } from "react";
import { formatValue } from "../../universe/presentation.mjs";
import { graphLines, ownershipGraph, type Owner } from "./owners-model";

export function OwnershipGraph({ owner }: { owner: Owner }) {
  const graph = ownershipGraph(owner);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = (graph.height - scroll.current.clientHeight) / 2;
  }, [owner.key, graph.height]);
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  return (
    <figure className="owners-graph">
      <figcaption>
        Reported stakes → companies held.{" "}
        {owner.listedSymbol
          ? "Holders of this listed owner appear on the left."
          : "Each edge shows a reported share percentage."}{" "}
        Columns show the eight largest reported stakes; +N more opens the full table.
      </figcaption>
      <div
        className="owners-graph-scroll"
        ref={scroll}
        role="region"
        aria-label="Ownership graph"
        tabIndex={0}
      >
        <svg
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          width={graph.width}
          height={graph.height}
          role="img"
          aria-label={`Reported ownership links for ${owner.name}`}
        >
          <defs>
            <marker
              id="owners-arrow"
              viewBox="0 0 8 8"
              refX="8"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0 0 L8 4 L0 8" />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const from = nodes.get(edge.from)!;
            const to = nodes.get(edge.to)!;
            const x1 = from.x + from.width;
            const y1 = from.y + from.height / 2;
            const x2 = to.x;
            const y2 = to.y + to.height / 2;
            const percentages = edge.percentages.map((value) => formatValue(value, "percent"));
            const labelX = edge.from.startsWith("upstream:") ? x1 + 6 : x2 - 6;
            return (
              <g key={edge.id}>
                <path
                  className="owners-edge"
                  d={`M ${x1} ${y1} C ${x1 + 38} ${y1}, ${x2 - 38} ${y2}, ${x2} ${y2}`}
                  markerEnd="url(#owners-arrow)"
                />
                <text
                  className="owners-edge-label"
                  x={labelX}
                  y={edge.from.startsWith("upstream:") ? y1 - 9 : y2 - 9}
                  textAnchor={edge.from.startsWith("upstream:") ? "start" : "end"}
                >
                  {percentages.map((percentage, index) => (
                    <tspan key={index} x={labelX} dy={index === 0 ? 0 : 12}>
                      {percentage}
                    </tspan>
                  ))}
                  <title>{percentages.join("; ")}</title>
                </text>
              </g>
            );
          })}
          {graph.nodes.map((node) => (
            <a key={node.id} href={node.href} aria-label={node.label}>
              <g
                className={`owners-node owners-node-${node.role}`}
                transform={`translate(${node.x}, ${node.y})`}
              >
                <title>{node.label}</title>
                <rect width={node.width} height={node.height} rx="3" />
                <text x="14" y={graphLines(node.label).length === 1 ? 33 : 23}>
                  {graphLines(node.label).map((line, index) => (
                    <tspan key={index} x="14" dy={index === 0 ? 0 : 18}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            </a>
          ))}
        </svg>
      </div>
    </figure>
  );
}
