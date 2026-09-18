import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import type {
  EmpireEntity,
  EmpireGraph,
  EmpireRelationship,
  EmpireView,
  GraphSelection,
} from "../../domain/empire";
import { calculateLayout, findPath, relationshipLabel, visibleGraph } from "./graph-model";

interface EmpireWorkspaceProps {
  graph: EmpireGraph;
}

const views: ReadonlyArray<{ id: EmpireView; label: string }> = [
  { id: "empire", label: "Empire" },
  { id: "all", label: "All owners" },
  { id: "control", label: "Control" },
  { id: "minority", label: "Minority" },
];

export function EmpireWorkspace({ graph }: EmpireWorkspaceProps) {
  const [view, setView] = useState<EmpireView>("empire");
  const [reflow, setReflow] = useState(0);
  const [selectedEntityId, setSelectedEntityId] = useState(graph.manifest.subjectEntityId);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>();
  const [trace, setTrace] = useState<GraphSelection | null>(null);

  const visible = useMemo(() => visibleGraph(graph, view), [graph, view]);
  const positions = useMemo(
    () => calculateLayout(graph, visible.entities, visible.relationships, reflow),
    [graph, visible, reflow],
  );
  const selectedEntity = graph.entities.find((entity) => entity.id === selectedEntityId);
  const selectedRelationship = graph.relationships.find(
    (relationship) => relationship.id === selectedRelationshipId,
  );

  function selectEntity(id: string) {
    setSelectedEntityId(id);
    setSelectedRelationshipId(undefined);
    setTrace(null);
  }

  function selectRelationship(id: string) {
    setSelectedRelationshipId(id);
    setSelectedEntityId("");
    setTrace(null);
  }

  function traceSini() {
    const sini = graph.entities.find((entity) => entity.ticker === "SINI");
    if (sini === undefined) return;
    setView("empire");
    setTrace(findPath(graph, sini.id));
    setSelectedEntityId(sini.id);
    setSelectedRelationshipId(undefined);
  }

  return (
    <main className="empire-page">
      <section className="empire-canvas" aria-label={`${graph.manifest.name} network`}>
        <header className="canvas-header">
          <div>
            <p className="eyebrow">
              Empire 01 <span>/</span> {graph.entities.length} entities <span>/</span>{" "}
              {graph.sources.length} Sectors sources
            </p>
            <h1>{graph.manifest.name}</h1>
          </div>
          <div className="canvas-actions">
            <div className="segmented-control" aria-label="Relationship filter">
              {views.map((option) => (
                <button
                  className={view === option.id ? "is-active" : undefined}
                  key={option.id}
                  onClick={() => {
                    setView(option.id);
                    setTrace(null);
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button className="text-action" onClick={traceSini} type="button">
              Trace SINI
            </button>
            <button
              className="reflow-action"
              onClick={() => setReflow((current) => current + 1)}
              type="button"
            >
              <span>↻</span> Reflow
            </button>
          </div>
        </header>

        <div className="graph-stage">
          <svg
            aria-label="Ownership relationships"
            className="relationship-layer"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 100 100"
          >
            <defs>
              <marker id="arrow" markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="context-stroke" />
              </marker>
            </defs>
            {visible.relationships.map((relationship) => {
              const from = positions.get(relationship.from);
              const to = positions.get(relationship.to);
              if (from === undefined || to === undefined) return null;
              const highlighted =
                trace?.relationshipIds.has(relationship.id) === true ||
                selectedRelationshipId === relationship.id;
              const muted = trace !== null && !highlighted;
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              return (
                <g
                  className={`relationship ${relationship.control === "non_controlling" ? "is-passive" : ""} ${highlighted ? "is-highlighted" : ""} ${muted ? "is-muted" : ""}`}
                  key={relationship.id}
                  onClick={() => selectRelationship(relationship.id)}
                >
                  <motion.line
                    animate={{ x1: from.x, x2: to.x, y1: from.y, y2: to.y }}
                    className="relationship-hitbox"
                    initial={false}
                  />
                  <motion.line
                    animate={{ x1: from.x, x2: to.x, y1: from.y, y2: to.y }}
                    className="relationship-line"
                    initial={false}
                    markerEnd="url(#arrow)"
                  />
                  <motion.text
                    animate={{ x: midX, y: midY }}
                    className="relationship-label"
                    initial={false}
                  >
                    {relationshipLabel(relationship)}
                  </motion.text>
                </g>
              );
            })}
          </svg>

          <AnimatePresence>
            {visible.entities.map((entity) => {
              const position = positions.get(entity.id);
              if (position === undefined) return null;
              const isSelected = entity.id === selectedEntityId;
              const isTraced = trace?.entityIds.has(entity.id) === true;
              const isMuted = trace !== null && !isTraced;
              return (
                <motion.button
                  animate={{
                    left: `${position.x}%`,
                    opacity: 1,
                    scale: 1,
                    top: `${position.y}%`,
                    x: "-50%",
                    y: "-50%",
                  }}
                  aria-pressed={isSelected}
                  className={`graph-node node-${entity.kind} ${isSelected ? "is-selected" : ""} ${isTraced ? "is-traced" : ""} ${isMuted ? "is-muted" : ""}`}
                  exit={{ opacity: 0, scale: 0.8 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  key={entity.id}
                  onClick={() => selectEntity(entity.id)}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                >
                  <span className="node-signal" />
                  <strong>{entity.ticker ?? entity.displayName}</strong>
                  <small>
                    {entity.ticker === undefined
                      ? entity.kind.replaceAll("_", " ")
                      : entity.displayName}
                  </small>
                </motion.button>
              );
            })}
          </AnimatePresence>

          <div className="graph-legend">
            <span>
              <i className="legend-line" /> Control or ownership
            </span>
            <span>
              <i className="legend-line is-passive" /> Minority position
            </span>
            <span>
              <i className="legend-dot" /> Selected signal
            </span>
          </div>
          <p className="graph-status">
            Live from Convex <span>•</span> As of {graph.manifest.asOf}
          </p>
        </div>
      </section>

      <IntelPanel
        graph={graph}
        onSelectEntity={selectEntity}
        onSelectRelationship={selectRelationship}
        selectedEntity={selectedEntity}
        selectedRelationship={selectedRelationship}
      />
    </main>
  );
}

interface IntelPanelProps {
  graph: EmpireGraph;
  selectedEntity?: EmpireEntity;
  selectedRelationship?: EmpireRelationship;
  onSelectEntity: (id: string) => void;
  onSelectRelationship: (id: string) => void;
}

function IntelPanel({
  graph,
  selectedEntity,
  selectedRelationship,
  onSelectEntity,
  onSelectRelationship,
}: IntelPanelProps) {
  if (selectedRelationship !== undefined) {
    const from = graph.entities.find((entity) => entity.id === selectedRelationship.from);
    const to = graph.entities.find((entity) => entity.id === selectedRelationship.to);
    const assertions = graph.assertions.filter(
      (assertion) => assertion.relationshipId === selectedRelationship.id,
    );
    const sourceIds = new Set(
      assertions.flatMap((assertion) => assertion.sourceRefs.map((source) => source.sourceId)),
    );
    const sources = graph.sources.filter((source) => sourceIds.has(source.id));

    return (
      <aside className="intel-panel" aria-live="polite">
        <p className="eyebrow">Relationship evidence</p>
        <h2>{relationshipLabel(selectedRelationship)}</h2>
        <p className="relationship-parties">
          <button onClick={() => onSelectEntity(selectedRelationship.from)} type="button">
            {from?.displayName ?? selectedRelationship.from}
          </button>
          <span>→</span>
          <button onClick={() => onSelectEntity(selectedRelationship.to)} type="button">
            {to?.displayName ?? selectedRelationship.to}
          </button>
        </p>
        <dl className="signal-grid">
          <div>
            <dt>Kind</dt>
            <dd>{selectedRelationship.kind.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Control</dt>
            <dd>{selectedRelationship.control.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Verified</dt>
            <dd>{selectedRelationship.lastVerifiedAt}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{selectedRelationship.status.replaceAll("_", " ")}</dd>
          </div>
        </dl>
        <section className="panel-section">
          <h3>Assertions</h3>
          {assertions.map((assertion) => (
            <article className="assertion-card" key={assertion.id}>
              <span>{assertion.confidence} confidence</span>
              <p>{assertion.statement}</p>
            </article>
          ))}
        </section>
        <section className="panel-section">
          <h3>Sectors sources</h3>
          <ul className="source-list">
            {sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} rel="noreferrer" target="_blank">
                  {source.title}
                </a>
                <small>Retrieved {source.retrievedAt}</small>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    );
  }

  const entity = selectedEntity ?? graph.entities[0];
  if (entity === undefined) return <aside className="intel-panel" />;
  const relationships = graph.relationships.filter(
    (relationship) => relationship.from === entity.id || relationship.to === entity.id,
  );

  return (
    <aside className="intel-panel" aria-live="polite">
      <p className="eyebrow">Entity intelligence</p>
      <div className="entity-heading">
        <div>
          <h2>{entity.ticker ?? entity.displayName}</h2>
          {entity.ticker !== undefined && <p>{entity.displayName}</p>}
        </div>
        <span className={`entity-badge kind-${entity.kind}`}>
          {entity.kind.replaceAll("_", " ")}
        </span>
      </div>
      <p className="entity-summary">{entity.summary}</p>
      {entity.ticker !== undefined && (
        <Link
          className="open-intelligence-link"
          to="/company/$ticker"
          params={{ ticker: entity.ticker }}
        >
          Open company intelligence <span>↗</span>
        </Link>
      )}
      <dl className="signal-grid">
        <div>
          <dt>Country</dt>
          <dd>{entity.country}</dd>
        </div>
        <div>
          <dt>Exchange</dt>
          <dd>{entity.exchange ?? "Private"}</dd>
        </div>
        <div>
          <dt>Connections</dt>
          <dd>{relationships.length}</dd>
        </div>
        <div>
          <dt>Coverage</dt>
          <dd>{entity.scopeRole === "boundary" ? "Boundary" : "Empire"}</dd>
        </div>
      </dl>
      <section className="panel-section">
        <h3>
          Connected intelligence <span>{relationships.length}</span>
        </h3>
        <ul className="connection-list">
          {relationships.map((relationship) => {
            const otherId = relationship.from === entity.id ? relationship.to : relationship.from;
            const other = graph.entities.find((candidate) => candidate.id === otherId);
            return (
              <li key={relationship.id}>
                <button onClick={() => onSelectRelationship(relationship.id)} type="button">
                  <span>{relationship.kind.replaceAll("_", " ")}</span>
                  <strong>{other?.ticker ?? other?.displayName ?? otherId}</strong>
                  <small>{relationshipLabel(relationship)}</small>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <footer className="panel-footnote">
        Data provider <strong>Sectors</strong> <span>•</span> {graph.sources.length} source records
      </footer>
    </aside>
  );
}
