import { CORPUS_FILE_NAMES, createEmpireCorpus } from "./src/empire-corpus.mjs";
import {
  calculateLayeredTargets,
  coverageSummary,
  deriveValuationCycle,
  edgeTone,
  entitySourceIds,
  formatMetric,
  formatProfileValue,
  groupProfileFacts,
  relationshipLabel,
  relationshipMatchesView
} from "./src/empire-view.mjs";

const WIDTH = 1000;
const HEIGHT = 620;

const state = {
  corpus: null,
  selectedNodeId: null,
  focusNodeId: "cuan",
  selectedRelationshipId: null,
  traceRelationshipIds: new Set(),
  traceNodeIds: new Set(),
  view: "empire",
  layoutMode: "network",
  positions: new Map(),
  targets: new Map(),
  nodeElements: new Map(),
  edgeElements: new Map(),
  heat: 0,
  animationFrame: null,
  flowRequestVersion: 0
};

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const humanize = (value) => value.replaceAll("_", " ");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

async function fetchEmpireCorpus(baseUrl) {
  const entries = await Promise.all(CORPUS_FILE_NAMES.map(async (name) => {
    const response = await fetch(`${baseUrl}/${name}.json`);
    if (!response.ok) throw new Error(`${name}.json returned HTTP ${response.status}`);
    return [name, await response.json()];
  }));
  return createEmpireCorpus(Object.fromEntries(entries));
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function calculateTargets() {
  state.targets.clear();
  if (state.layoutMode === "network") {
    state.targets = calculateLayeredTargets(state.corpus, WIDTH, HEIGHT);
    return;
  }

  const focusId = state.focusNodeId ?? state.corpus.manifest.subjectEntityId;
  const neighbours = new Set();
  for (const relationship of state.corpus.relationships) {
    if (!relationshipMatchesView(relationship, state.view)) continue;
    if (relationship.from === focusId) neighbours.add(relationship.to);
    if (relationship.to === focusId) neighbours.add(relationship.from);
  }
  state.targets.set(focusId, { x: 500, y: 300 });
  [...neighbours].forEach((id, index, ids) => {
    const angle = -Math.PI / 2 + (index / Math.max(ids.length, 1)) * Math.PI * 2;
    state.targets.set(id, { x: 500 + Math.cos(angle) * 230, y: 300 + Math.sin(angle) * 175 });
  });
  const outer = state.corpus.entities.filter(({ id }) => id !== focusId && !neighbours.has(id));
  outer.forEach(({ id }, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(outer.length, 1)) * Math.PI * 2;
    state.targets.set(id, { x: 500 + Math.cos(angle) * 405, y: 300 + Math.sin(angle) * 245 });
  });
}

function initializePositions() {
  calculateTargets();
  state.positions.clear();
  for (const entity of state.corpus.entities) {
    const target = state.targets.get(entity.id);
    state.positions.set(entity.id, { ...target, vx: 0, vy: 0, pinned: false });
  }
}

function edgeGeometry(relationship, index) {
  const from = state.positions.get(relationship.from);
  const to = state.positions.get(relationship.to);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const start = { x: from.x + ux * 82, y: from.y + uy * 44 };
  const end = { x: to.x - ux * 84, y: to.y - uy * 44 };
  const direction = index % 2 === 0 ? 1 : -1;
  const bend = direction * (14 + (index % 3) * 7);
  const control = {
    x: (start.x + end.x) / 2 - uy * bend,
    y: (start.y + end.y) / 2 + ux * bend
  };
  return {
    path: `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    labelX: (start.x + 2 * control.x + end.x) / 4,
    labelY: (start.y + 2 * control.y + end.y) / 4 - 9
  };
}

function createSvgDefinitions(svg) {
  const definitions = svgElement("defs");
  for (const [id, color] of [
    ["arrow-control", "#7e9187"],
    ["arrow-event", "#ffb84d"],
    ["arrow-passive", "#65d7ff"],
    ["arrow-selected", "#d6ff3f"]
  ]) {
    const marker = svgElement("marker", {
      id,
      viewBox: "0 0 10 10",
      refX: "8",
      refY: "5",
      markerWidth: "6",
      markerHeight: "6",
      orient: "auto-start-reverse"
    });
    marker.append(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: color }));
    definitions.append(marker);
  }
  svg.append(definitions);
}

function createEdge(relationship, index) {
  const tone = edgeTone(relationship);
  const group = svgElement("g", { class: `edge-group is-${tone}`, "data-relationship": relationship.id });
  const visible = svgElement("path", { class: `edge-visible is-${tone}` });
  const flow = svgElement("path", { class: `edge-flow is-${tone}` });
  const hit = svgElement("path", { class: "edge-hit" });
  const label = svgElement("text", { class: "edge-label" });
  label.textContent = relationshipLabel(relationship);
  group.addEventListener("click", () => selectRelationship(relationship.id));
  group.append(visible, flow, hit, label);
  document.querySelector("#relationship-layer").append(group);
  state.edgeElements.set(relationship.id, { group, visible, flow, hit, label, index });
}

function pointerPosition(event) {
  const bounds = document.querySelector("#graph-stage").getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * WIDTH,
    y: ((event.clientY - bounds.top) / bounds.height) * HEIGHT
  };
}

function bindNodeInteraction(button, entity) {
  let drag = null;
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const pointer = pointerPosition(event);
    const position = state.positions.get(entity.id);
    drag = { pointerId: event.pointerId, offsetX: position.x - pointer.x, offsetY: position.y - pointer.y, moved: false };
    position.pinned = true;
    position.vx = 0;
    position.vy = 0;
    button.setPointerCapture(event.pointerId);
    button.classList.add("is-dragging");
  });
  button.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const pointer = pointerPosition(event);
    const position = state.positions.get(entity.id);
    const nextX = clamp(pointer.x + drag.offsetX, 92, WIDTH - 92);
    const nextY = clamp(pointer.y + drag.offsetY, 50, HEIGHT - 58);
    drag.moved ||= Math.hypot(nextX - position.x, nextY - position.y) > 3;
    position.x = nextX;
    position.y = nextY;
    updateGeometry();
  });
  button.addEventListener("pointerup", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = drag.moved;
    drag = null;
    button.classList.remove("is-dragging");
    if (!moved) selectNode(entity.id);
  });
  button.addEventListener("pointercancel", () => {
    drag = null;
    button.classList.remove("is-dragging");
  });
}

function createNode(entity) {
  const button = document.createElement("button");
  button.className = "company-node";
  button.type = "button";
  button.dataset.node = entity.id;
  button.dataset.kind = entity.kind;
  button.innerHTML = `
    <span class="node-ticker">${escapeHtml(entity.ticker ?? humanize(entity.kind))}</span>
    <strong>${escapeHtml(entity.displayName)}</strong>
    <small>${escapeHtml(entity.summary)}</small>
    <i class="node-status"></i>`;
  button.setAttribute("aria-label", `Inspect or drag ${entity.displayName}`);
  bindNodeInteraction(button, entity);
  document.querySelector("#node-layer").append(button);
  state.nodeElements.set(entity.id, button);
}

function buildGraph() {
  const svg = document.querySelector("#relationship-layer");
  const nodeLayer = document.querySelector("#node-layer");
  svg.replaceChildren();
  nodeLayer.replaceChildren();
  state.edgeElements.clear();
  state.nodeElements.clear();
  createSvgDefinitions(svg);
  state.corpus.relationships.forEach(createEdge);
  state.corpus.entities.forEach(createNode);
  refreshGraphState();
  updateGeometry();
}

function connectedNodeIds() {
  const ids = new Set();
  if (!state.selectedNodeId) return ids;
  for (const relationship of state.corpus.relationships) {
    if (!relationshipMatchesView(relationship, state.view)) continue;
    if (relationship.from === state.selectedNodeId) ids.add(relationship.to);
    if (relationship.to === state.selectedNodeId) ids.add(relationship.from);
  }
  return ids;
}

function refreshGraphState() {
  const connectedIds = connectedNodeIds();
  const hasTrace = state.traceNodeIds.size > 0;
  const visibleNodeIds = new Set([state.corpus.manifest.subjectEntityId]);
  for (const relationship of state.corpus.relationships) {
    if (!relationshipMatchesView(relationship, state.view)) continue;
    visibleNodeIds.add(relationship.from);
    visibleNodeIds.add(relationship.to);
  }
  for (const entity of state.corpus.entities) {
    const element = state.nodeElements.get(entity.id);
    const selected = entity.id === state.selectedNodeId;
    const trace = state.traceNodeIds.has(entity.id);
    const dimmedByNode = state.selectedNodeId && !selected && !connectedIds.has(entity.id);
    const dimmedByTrace = hasTrace && !trace;
    element.classList.toggle("is-selected", selected);
    element.classList.toggle("is-connected", connectedIds.has(entity.id));
    element.classList.toggle("is-trace", trace);
    element.classList.toggle("is-dimmed", Boolean(dimmedByNode || dimmedByTrace));
    element.classList.toggle("is-pinned", state.positions.get(entity.id).pinned);
    element.classList.toggle("is-hidden", !visibleNodeIds.has(entity.id));
  }
  for (const relationship of state.corpus.relationships) {
    const elements = state.edgeElements.get(relationship.id);
    const selected = state.selectedRelationshipId === relationship.id;
    const trace = state.traceRelationshipIds.has(relationship.id);
    const related = Boolean(state.selectedNodeId && (relationship.from === state.selectedNodeId || relationship.to === state.selectedNodeId));
    elements.group.classList.toggle("is-hidden", !relationshipMatchesView(relationship, state.view));
    elements.group.classList.toggle("is-selected", selected);
    elements.group.classList.toggle("is-related", related);
    elements.group.classList.toggle("is-trace", trace);
    elements.group.classList.toggle("is-muted", Boolean((state.selectedNodeId && !related) || (hasTrace && !trace)));
    const tone = edgeTone(relationship);
    const marker = selected || trace ? "arrow-selected" : tone === "passive" ? "arrow-passive" : tone === "event" ? "arrow-event" : "arrow-control";
    elements.visible.setAttribute("marker-end", `url(#${marker})`);
  }
  document.querySelector("#trace-target").classList.toggle("is-active", hasTrace);
}

function updateGeometry() {
  for (const [id, element] of state.nodeElements) {
    const position = state.positions.get(id);
    element.style.left = `${(position.x / WIDTH) * 100}%`;
    element.style.top = `${(position.y / HEIGHT) * 100}%`;
    element.classList.toggle("is-pinned", position.pinned);
  }
  for (const relationship of state.corpus.relationships) {
    const elements = state.edgeElements.get(relationship.id);
    const geometry = edgeGeometry(relationship, elements.index);
    elements.visible.setAttribute("d", geometry.path);
    elements.flow.setAttribute("d", geometry.path);
    elements.hit.setAttribute("d", geometry.path);
    elements.label.setAttribute("x", geometry.labelX);
    elements.label.setAttribute("y", geometry.labelY);
  }
}

function resolveCollisions() {
  const stageBounds = document.querySelector("#graph-stage").getBoundingClientRect();
  const collisionWidth = (194 / stageBounds.width) * WIDTH;
  const collisionHeight = (86 / stageBounds.height) * HEIGHT;
  const positions = [...state.positions.values()];
  const focusPosition = state.positions.get(state.focusNodeId);
  const fixed = (position) => position.pinned || (state.layoutMode === "orbit" && position === focusPosition);
  for (let pass = 0; pass < 6; pass += 1) {
    for (let firstIndex = 0; firstIndex < positions.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < positions.length; secondIndex += 1) {
        const first = positions[firstIndex];
        const second = positions[secondIndex];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const overlapX = collisionWidth - Math.abs(dx);
        const overlapY = collisionHeight - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        const firstShare = fixed(first) ? 0 : fixed(second) ? 1 : 0.5;
        const secondShare = fixed(second) ? 0 : fixed(first) ? 1 : 0.5;
        if (overlapX / collisionWidth < overlapY / collisionHeight) {
          const direction = Math.sign(dx || 1);
          first.x -= direction * (overlapX + 4) * firstShare;
          second.x += direction * (overlapX + 4) * secondShare;
        } else {
          const direction = Math.sign(dy || 1);
          first.y -= direction * (overlapY + 4) * firstShare;
          second.y += direction * (overlapY + 4) * secondShare;
        }
      }
    }
  }
  for (const position of positions) {
    position.x = clamp(position.x, collisionWidth / 2, WIDTH - collisionWidth / 2);
    position.y = clamp(position.y, collisionHeight / 2, HEIGHT - collisionHeight / 2);
  }
}

function simulationStep() {
  if (state.heat < 0.005) {
    state.animationFrame = null;
    return;
  }
  const positions = [...state.positions.values()];
  for (let firstIndex = 0; firstIndex < positions.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < positions.length; secondIndex += 1) {
      const first = positions[firstIndex];
      const second = positions[secondIndex];
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      if (distance > 250) continue;
      const force = ((250 - distance) / 250) * 1.15 * state.heat;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      if (!first.pinned) { first.vx -= fx; first.vy -= fy; }
      if (!second.pinned) { second.vx += fx; second.vy += fy; }
    }
  }
  for (const relationship of state.corpus.relationships) {
    if (!relationshipMatchesView(relationship, state.view)) continue;
    const from = state.positions.get(relationship.from);
    const to = state.positions.get(relationship.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const desired = state.layoutMode === "orbit" ? 220 : 185;
    const force = (distance - desired) * 0.0018 * state.heat;
    if (!from.pinned) { from.vx += dx * force; from.vy += dy * force; }
    if (!to.pinned) { to.vx -= dx * force; to.vy -= dy * force; }
  }
  for (const entity of state.corpus.entities) {
    const position = state.positions.get(entity.id);
    if (position.pinned) continue;
    const target = state.targets.get(entity.id);
    if (state.layoutMode === "orbit" && entity.id === state.focusNodeId) {
      Object.assign(position, target, { vx: 0, vy: 0 });
      continue;
    }
    const pull = state.layoutMode === "orbit" ? 0.075 : 0.018;
    position.vx += (target.x - position.x) * pull * state.heat;
    position.vy += (target.y - position.y) * pull * state.heat;
    position.vx *= 0.77;
    position.vy *= 0.77;
    position.x = clamp(position.x + position.vx, 92, WIDTH - 92);
    position.y = clamp(position.y + position.vy, 50, HEIGHT - 58);
  }
  resolveCollisions();
  state.heat *= 0.965;
  updateGeometry();
  state.animationFrame = requestAnimationFrame(simulationStep);
}

function kickSimulation(heat = 1) {
  state.heat = Math.max(state.heat, heat);
  if (!state.animationFrame) state.animationFrame = requestAnimationFrame(simulationStep);
}

function reflow() {
  for (const [id, position] of state.positions) {
    position.pinned = false;
    position.vx = (id.length % 3 - 1) * 0.8;
    position.vy = (id.length % 2 ? 1 : -1) * 0.6;
  }
  calculateTargets();
  refreshGraphState();
  kickSimulation(1);
}

function sourceListMarkup(sourceIds) {
  return sourceIds.map((id) => state.corpus.getSource(id)).filter(Boolean).map((source) => {
    const endpoint = new URL(source.url);
    return `<li class="source-record">
      <strong>${escapeHtml(source.title)}</strong>
      <code>${escapeHtml(`${endpoint.pathname}${endpoint.search}`)}</code>
      <small>Sectors REST API · retrieved ${escapeHtml(source.retrievedAt)}</small>
    </li>`;
  }).join("");
}

function relationshipButtonMarkup(relationship, entityId) {
  const otherId = relationship.from === entityId ? relationship.to : relationship.from;
  const other = state.corpus.getEntity(otherId);
  return `
    <li><button class="relationship-button" data-relationship="${escapeHtml(relationship.id)}" type="button">
      <span>${escapeHtml(humanize(relationship.kind))} · ${escapeHtml(relationship.lastVerifiedAt)}</span>
      <strong>${escapeHtml(relationshipLabel(relationship))} · ${escapeHtml(other.displayName)}</strong>
    </button></li>`;
}

function bindPanelRelationshipButtons() {
  document.querySelectorAll(".relationship-button").forEach((button) => {
    button.addEventListener("click", () => selectRelationship(button.dataset.relationship));
  });
}

function profileFactsMarkup(profile) {
  if (profile.facts.length === 0) return "";
  const facts = groupProfileFacts(profile.facts);
  const metrics = facts.profile_metric ?? [];
  const financialYears = facts.financial_year ?? [];
  const signals = facts.signal ?? [];
  const gaps = facts.data_gap ?? [];
  const cycle = profile.entity.kind === "listed_company" && profile.entity.scopeRole !== "boundary" ? deriveValuationCycle(profile.facts) : null;
  const maxRevenue = Math.max(...financialYears.map(({ revenue }) => revenue), 1);
  return `
    ${cycle ? valuationCycleMarkup(cycle) : ""}
    ${metrics.length > 0 ? `<section class="panel-section profile-block">
      <div class="section-heading"><h3>At a glance</h3><span>Sectors company report</span></div>
      <div class="profile-metric-grid">${metrics.map((fact) => `
        <article class="profile-metric-card">
          <span>${escapeHtml(fact.label)}</span>
          <strong>${escapeHtml(formatProfileValue(fact.value, fact.unit))}</strong>
          <small>${escapeHtml(fact.context)}</small>
        </article>`).join("")}</div>
    </section>` : ""}
    ${financialYears.length > 0 ? `<section class="panel-section profile-block">
      <div class="section-heading"><h3>Financial trajectory</h3><span>Annual · IDR</span></div>
      <ul class="financial-list">${financialYears.map((year) => `<li>
        <div class="financial-heading"><strong>${escapeHtml(year.year)}</strong><span>${escapeHtml(formatProfileValue(year.revenue, year.unit))} revenue</span></div>
        <div class="financial-track"><i style="width:${(year.revenue / maxRevenue) * 100}%"></i></div>
        <small>${escapeHtml(formatProfileValue(year.earnings, year.unit))} earnings · ${escapeHtml(formatProfileValue(year.freeCashFlow, year.unit))} FCF</small>
      </li>`).join("")}</ul>
    </section>` : ""}
    ${signals.length > 0 ? `<section class="panel-section profile-block">
      <div class="section-heading"><h3>Derived signals</h3><span>Calculated from Sectors</span></div>
      <ul class="signal-list">${signals.map((signal) => `<li data-tone="${escapeHtml(signal.tone)}">
        <div><strong>${escapeHtml(signal.label)}</strong><span>${escapeHtml(formatProfileValue(signal.value, signal.unit))}</span></div>
        <p>${escapeHtml(signal.context)}</p>
      </li>`).join("")}</ul>
      <p class="profile-caveat">Information and analysis only. These signals are not investment recommendations.</p>
    </section>` : ""}
    ${gaps.length > 0 ? `<section class="panel-section profile-block">
      <div class="section-heading"><h3>Data boundary</h3><span>Sectors coverage</span></div>
      ${gaps.map((gap) => `<article class="gap-card"><strong>${escapeHtml(gap.label)}</strong><p>${escapeHtml(gap.context)}</p></article>`).join("")}
    </section>` : ""}`;
}

function percentageChange(value) {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
}

function valuationCycleMarkup(cycle) {
  const passed = Object.values(cycle.checks).filter(Boolean).length;
  return `<section class="panel-section cycle-card" data-stage="${escapeHtml(cycle.stage)}">
    <div class="section-heading"><h3>Valuation cycle</h3><span>${escapeHtml(cycle.confidence)} confidence</span></div>
    <div class="cycle-title"><span>${escapeHtml(cycle.title)}</span><strong>${passed}/3 checks</strong></div>
    <p>${escapeHtml(cycle.summary)}</p>
    <div class="cycle-evidence">${cycle.evidence.map(({ label, value }) => `<span><small>${escapeHtml(label)}</small><strong>${escapeHtml(percentageChange(value))}</strong></span>`).join("")}</div>
    <ul class="cycle-checks">
      <li data-pass="${cycle.checks.earningsSupport}"><i></i>Earnings support</li>
      <li data-pass="${cycle.checks.cashDelivery}"><i></i>Cash delivery</li>
      <li data-pass="${cycle.checks.peerPremium}"><i></i>Peer-premium guardrail</li>
    </ul>
    <details><summary>Failure conditions</summary><ul>${cycle.guardrails.map((guardrail) => `<li>${escapeHtml(guardrail)}</li>`).join("")}</ul></details>
  </section>`;
}

function renderCycleBoard() {
  state.flowRequestVersion += 1;
  clearTrace();
  state.selectedNodeId = null;
  state.selectedRelationshipId = null;
  const companies = state.corpus.entities.filter(({ kind, scopeRole }) => kind === "listed_company" && scopeRole !== "boundary").map((entity) => {
    const cycle = deriveValuationCycle(state.corpus.getEntityProfile(entity.id).facts);
    return { entity, cycle, passed: Object.values(cycle.checks).filter(Boolean).length };
  }).sort((first, second) => second.passed - first.passed || first.entity.ticker.localeCompare(second.entity.ticker));
  document.querySelector("#intel-panel").innerHTML = `
    <header class="panel-header">
      <p class="panel-kicker">Cross-empire signal screen</p>
      <h2>Valuation cycle board</h2>
      <p class="panel-summary">A transparent comparison of earnings support, cash delivery, and peer-premium risk. This is a research queue, not a ranking or recommendation.</p>
    </header>
    <section class="panel-section">
      <div class="section-heading"><h3>Listed companies</h3><span>${companies.length} Sectors profiles</span></div>
      <div class="cycle-board-list">${companies.map(({ entity, cycle, passed }) => `<button type="button" data-cycle-entity="${escapeHtml(entity.id)}" data-stage="${escapeHtml(cycle.stage)}">
        <span><strong>${escapeHtml(entity.ticker)}</strong><small>${escapeHtml(cycle.title)}</small></span>
        <span class="cycle-score">${passed}/3<small>${escapeHtml(cycle.readiness)}</small></span>
      </button>`).join("")}</div>
      <p class="profile-caveat">Passing more checks only moves a company up the research queue. It does not predict price direction.</p>
    </section>`;
  document.querySelectorAll("[data-cycle-entity]").forEach((button) => button.addEventListener("click", () => selectNode(button.dataset.cycleEntity)));
  document.querySelector("#layout-readout").textContent = "Cross-empire valuation screen";
  document.querySelector("#flow-board").classList.remove("is-active");
  refreshGraphState();
}

const compactIdr = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function brokerFlowListMarkup(rows, emptyLabel) {
  if (rows.length === 0) return `<p class="flow-empty">${escapeHtml(emptyLabel)}</p>`;
  return `<ol class="flow-broker-list">${rows.map((broker) => `<li>
    <span>${escapeHtml(broker.brokerCode)}</span>
    <strong>${escapeHtml(compactIdr.format(Math.abs(broker.net.value)))}</strong>
  </li>`).join("")}</ol>`;
}

async function renderFlowBoard() {
  const focused = state.corpus.getEntity(state.focusNodeId);
  const entity = focused?.kind === "listed_company" && focused.ticker ? focused : state.corpus.getEntity("sini");
  const ticker = entity.ticker;
  const requestVersion = ++state.flowRequestVersion;
  document.querySelector("#empire-nav").classList.remove("is-active");
  document.querySelector("#cycle-board").classList.remove("is-active");
  document.querySelector("#flow-board").classList.add("is-active");
  document.querySelector("#layout-readout").textContent = `Loading broker flow / ${ticker}`;
  document.querySelector("#intel-panel").innerHTML = `<p class="panel-loading">Checking persisted ${escapeHtml(ticker)} broker flow before calling Sectors…</p>`;
  try {
    const response = await fetch(`/api/flow/${encodeURIComponent(ticker)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `Flow returned HTTP ${response.status}`);
    if (requestVersion !== state.flowRequestVersion) return;
    const latest = result.days.at(-1) ?? null;
    const buyers = latest ? [...latest.brokers].filter(({ net }) => net.value > 0).sort((a, b) => b.net.value - a.net.value).slice(0, 5) : [];
    const sellers = latest ? [...latest.brokers].filter(({ net }) => net.value < 0).sort((a, b) => a.net.value - b.net.value).slice(0, 5) : [];
    const firstDate = result.days[0]?.tradingDate ?? "No stored sessions";
    const latestDate = latest?.tradingDate ?? "No broker data returned";
    const sourceLabel = result.fetch.credits === 0 ? "persisted response · 0 credits" : `${result.fetch.credits} Sectors credit spent`;
    document.querySelector("#layout-readout").textContent = `Broker flow / ${ticker} / ${latestDate}`;
    document.querySelector("#intel-panel").innerHTML = `
      <header class="panel-header">
        <p class="panel-kicker">Broker flow / ${escapeHtml(ticker)}</p>
        <h2>${escapeHtml(entity.displayName)}</h2>
        <div class="panel-tags"><span class="panel-tag is-ticker">${escapeHtml(sourceLabel)}</span><span class="panel-tag">${result.days.length} stored sessions</span></div>
        <p class="panel-summary">The server fetched only the latest 14-day broker-summary window. Every returned trading day is now stored for later visits.</p>
      </header>
      <section class="panel-section flow-coverage">
        <div class="section-heading"><h3>Stored coverage</h3><span>${escapeHtml(firstDate)} → ${escapeHtml(latestDate)}</span></div>
        <p>${result.fetch.created} new days · ${result.fetch.unchanged} existing days · request window ${escapeHtml(result.window.start)} → ${escapeHtml(result.window.end)}</p>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h3>Latest session</h3><span>${escapeHtml(latestDate)}</span></div>
        <div class="flow-columns">
          <div><h4>Net buyers</h4>${brokerFlowListMarkup(buyers, "No net buyers")}</div>
          <div><h4>Net sellers</h4>${brokerFlowListMarkup(sellers, "No net sellers")}</div>
        </div>
        <p class="profile-caveat">These are raw broker facts for this ticker. They do not imply owner affiliation or smart-money status.</p>
      </section>`;
  } catch (error) {
    if (requestVersion !== state.flowRequestVersion) return;
    document.querySelector("#intel-panel").innerHTML = `<p class="panel-error">Broker flow failed to load.<br><br>${escapeHtml(error instanceof Error ? error.message : error)}</p>`;
  }
}

function renderNodePanel(entity) {
  const profile = state.corpus.getEntityProfile(entity.id);
  const coverage = coverageSummary(state.corpus, entity.id);
  const sourceIds = entitySourceIds(state.corpus, entity.id);
  const coveragePercent = (coverage.checked / coverage.total) * 100;
  document.querySelector("#intel-panel").innerHTML = `
    <header class="panel-header">
      <p class="panel-kicker">${escapeHtml(humanize(entity.kind))}</p>
      <h2>${escapeHtml(entity.displayName)}</h2>
      <div class="panel-tags">
        ${entity.ticker ? `<span class="panel-tag is-ticker">${escapeHtml(entity.ticker)} · ${escapeHtml(entity.exchange)}</span>` : ""}
        <span class="panel-tag">${escapeHtml(entity.country)}</span>
        <span class="panel-tag">${escapeHtml(coverage.frontier.status)} research</span>
      </div>
      <p class="panel-summary">${escapeHtml(entity.summary)}</p>
    </header>
    ${profileFactsMarkup(profile)}
    <section class="panel-section">
      <h3>Research coverage · ${coverage.checked}/${coverage.total} complete</h3>
      <div class="coverage-meter"><i style="width:${coveragePercent}%"></i></div>
      <ul class="coverage-list">${coverage.areas.map(({ area, status }) => `<li><span>${escapeHtml(humanize(area))}</span><span>${escapeHtml(status)}</span></li>`).join("")}</ul>
      <p class="frontier-action"><strong>Next:</strong> ${escapeHtml(coverage.frontier.nextAction)}</p>
    </section>
    <section class="panel-section">
      <h3>Connected intelligence · ${profile.relationships.length}</h3>
      <ul class="relationship-list">${profile.relationships.map((relationship) => relationshipButtonMarkup(relationship, entity.id)).join("")}</ul>
    </section>
    <section class="panel-section">
      <h3>Sources · ${sourceIds.length}</h3>
      <ul class="source-list">${sourceListMarkup(sourceIds)}</ul>
    </section>`;
  bindPanelRelationshipButtons();
}

function renderRelationshipPanel(relationship) {
  const from = state.corpus.getEntity(relationship.from);
  const to = state.corpus.getEntity(relationship.to);
  const evidence = state.corpus.getRelationshipEvidence(relationship.id);
  const sourceIds = [...new Set(evidence.flatMap(({ sourceRefs }) => sourceRefs.map(({ sourceId }) => sourceId)))];
  document.querySelector("#intel-panel").innerHTML = `
    <header class="panel-header">
      <p class="panel-kicker">${escapeHtml(humanize(relationship.kind))}</p>
      <h2>${escapeHtml(relationshipLabel(relationship))}</h2>
      <div class="panel-tags">
        <span class="panel-tag">${escapeHtml(humanize(relationship.status))}</span>
        <span class="panel-tag">${escapeHtml(relationship.directness)}</span>
        <span class="panel-tag">${escapeHtml(humanize(relationship.control))}</span>
      </div>
      <div class="metric-list">${relationship.metrics.map((metric) => `<span class="metric">${escapeHtml(formatMetric(metric))}</span>`).join("")}</div>
    </header>
    <section class="panel-section">
      <h3>Relationship path</h3>
      <p class="relationship-meta">From</p><p class="relationship-detail">${escapeHtml(from.displayName)}${from.ticker ? ` · ${escapeHtml(from.ticker)}` : ""}</p>
      <p class="relationship-meta">To</p><p class="relationship-detail">${escapeHtml(to.displayName)}${to.ticker ? ` · ${escapeHtml(to.ticker)}` : ""}</p>
      <p class="relationship-meta">Last verified</p><p class="relationship-detail">${escapeHtml(relationship.lastVerifiedAt)}</p>
    </section>
    <section class="panel-section">
      <h3>Assertions · ${evidence.length}</h3>
      <ul class="evidence-list">${evidence.map((assertion) => {
        const speaker = assertion.speakerEntityId ? state.corpus.getEntity(assertion.speakerEntityId) : null;
        const type = assertion.type === "party_claim" ? `Claim by ${speaker.displayName}` : humanize(assertion.type);
        return `<li class="evidence-card"><div class="evidence-meta"><span class="${assertion.type === "party_claim" ? "claim" : ""}">${escapeHtml(type)}</span><span>${escapeHtml(assertion.confidence)} confidence</span></div><p>${escapeHtml(assertion.statement)}</p></li>`;
      }).join("")}</ul>
    </section>
    <section class="panel-section">
      <h3>Evidence sources · ${sourceIds.length}</h3>
      <ul class="source-list">${sourceListMarkup(sourceIds)}</ul>
    </section>`;
}

function renderTracePanel(path, destination) {
  document.querySelector("#intel-panel").innerHTML = `
    <header class="panel-header">
      <p class="panel-kicker">Evidence path / ${path.length} relationships</p>
      <h2>Path to ${escapeHtml(destination.ticker ?? destination.displayName)}</h2>
      <div class="panel-tags"><span class="panel-tag is-ticker">${escapeHtml(destination.ticker ?? "Operating company")}</span><span class="panel-tag">Sectors ownership data</span></div>
      <p class="panel-summary">Every step in this path comes from the Sectors company report or mining ownership endpoint.</p>
    </header>
    <section class="panel-section">
      <h3>Trace</h3>
      <ol class="trace-list">${path.map((relationship, index) => {
        const from = state.corpus.getEntity(relationship.from);
        const to = state.corpus.getEntity(relationship.to);
        return `<li><span class="trace-index">0${index + 1}</span><div><strong>${escapeHtml(from.ticker ?? from.displayName)} → ${escapeHtml(to.ticker ?? to.displayName)}</strong><small>${escapeHtml(relationshipLabel(relationship))} · ${escapeHtml(humanize(relationship.kind))}</small></div></li>`;
      }).join("")}</ol>
    </section>
    <section class="panel-section">
      <h3>Read the evidence</h3>
      <ul class="relationship-list">${path.map((relationship) => relationshipButtonMarkup(relationship, relationship.from)).join("")}</ul>
    </section>`;
  bindPanelRelationshipButtons();
}

function clearTrace() {
  state.traceRelationshipIds.clear();
  state.traceNodeIds.clear();
}

function selectNode(id) {
  state.flowRequestVersion += 1;
  clearTrace();
  state.selectedNodeId = id;
  state.focusNodeId = id;
  state.selectedRelationshipId = null;
  const entity = state.corpus.getEntity(id);
  if (state.layoutMode === "orbit") {
    calculateTargets();
    for (const position of state.positions.values()) position.pinned = false;
    kickSimulation(1);
  }
  document.querySelector("#layout-readout").textContent = state.layoutMode === "orbit"
    ? `Orbiting ${entity.ticker ?? entity.displayName}`
    : `Company profile / ${entity.ticker ?? entity.displayName}`;
  refreshGraphState();
  renderNodePanel(entity);
  document.querySelector("#empire-nav").classList.add("is-active");
  document.querySelector("#flow-board").classList.remove("is-active");
  document.querySelector("#cycle-board").classList.remove("is-active");
}

function selectRelationship(id) {
  state.flowRequestVersion += 1;
  clearTrace();
  state.selectedNodeId = null;
  state.selectedRelationshipId = id;
  refreshGraphState();
  renderRelationshipPanel(state.corpus.relationships.find(({ id: candidate }) => candidate === id));
  document.querySelector("#empire-nav").classList.add("is-active");
  document.querySelector("#flow-board").classList.remove("is-active");
  document.querySelector("#cycle-board").classList.remove("is-active");
}

function traceSini() {
  const destination = state.corpus.getEntity("sini");
  const path = state.corpus.findPath(state.corpus.manifest.subjectEntityId, destination.id);
  if (!path) throw new Error("No Sectors-backed path from the research subject to SINI");
  state.view = "empire";
  state.selectedNodeId = null;
  state.selectedRelationshipId = null;
  state.focusNodeId = destination.id;
  state.traceRelationshipIds = new Set(path.map(({ id }) => id));
  state.traceNodeIds = new Set([state.corpus.manifest.subjectEntityId, ...path.map(({ to }) => to)]);
  document.querySelectorAll(".view-filter").forEach((button) => button.classList.toggle("is-active", button.dataset.view === "empire"));
  document.querySelector("#layout-readout").textContent = "Sectors path to SINI";
  refreshGraphState();
  renderTracePanel(path, destination);
}

function bindControls() {
  document.querySelectorAll(".view-filter").forEach((button) => {
    button.addEventListener("click", () => {
      clearTrace();
      state.view = button.dataset.view;
      if (!state.selectedNodeId && !state.selectedRelationshipId) {
        state.selectedNodeId = state.corpus.manifest.subjectEntityId;
        state.focusNodeId = state.selectedNodeId;
        renderNodePanel(state.corpus.getEntity(state.selectedNodeId));
      }
      document.querySelectorAll(".view-filter").forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
      calculateTargets();
      refreshGraphState();
      kickSimulation(0.7);
    });
  });
  document.querySelectorAll(".layout-mode").forEach((button) => {
    button.addEventListener("click", () => {
      state.layoutMode = button.dataset.layout;
      document.querySelectorAll(".layout-mode").forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
      const focus = state.corpus.getEntity(state.focusNodeId);
      document.querySelector("#layout-readout").textContent = state.layoutMode === "orbit" ? `Orbiting ${focus.ticker ?? focus.displayName}` : "Empire overview";
      reflow();
    });
  });
  document.querySelector("#reflow-button").addEventListener("click", reflow);
  document.querySelector("#trace-target").addEventListener("click", traceSini);
  document.querySelector("#cycle-board").addEventListener("click", () => {
    document.querySelector("#cycle-board").classList.add("is-active");
    document.querySelector("#empire-nav").classList.remove("is-active");
    renderCycleBoard();
  });
  document.querySelector("#flow-board").addEventListener("click", renderFlowBoard);
  document.querySelector("#empire-nav").addEventListener("click", () => selectNode(state.focusNodeId ?? "cuan"));
}

try {
  state.corpus = await fetchEmpireCorpus("data/empires/prajogo");
  document.querySelector("#as-of").textContent = `As of ${state.corpus.manifest.asOf}`;
  document.querySelector("#empire-title").textContent = state.corpus.manifest.name;
  document.querySelector("#empire-kicker").textContent = `Empire 01 / ${state.corpus.entities.length} entities / ${state.corpus.sources.length} sources`;
  initializePositions();
  buildGraph();
  bindControls();
  selectNode("cuan");
  kickSimulation(0.7);
} catch (error) {
  console.error(error);
  document.querySelector("#intel-panel").innerHTML = `<p class="panel-error">The Empire corpus failed to load.<br><br>${escapeHtml(error instanceof Error ? error.message : error)}</p>`;
}
