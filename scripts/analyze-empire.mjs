import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { loadEmpireCorpus } from "../src/load-empire-corpus.mjs";
import { groupProfileFacts } from "../src/empire-view.mjs";

const OWNERSHIP_KINDS = new Set(["control", "shareholding", "portfolio_investment"]);

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function percentChange(current, previous) {
  return finite(current) && finite(previous) && previous !== 0
    ? (current - previous) / Math.abs(previous) * 100
    : null;
}

function findDirectedPath(corpus, startEntityId, endEntityId, predicate) {
  const queue = [{ entityId: startEntityId, path: [] }];
  const visited = new Set([startEntityId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.entityId === endEntityId) return current.path;

    for (const relationship of corpus.relationships) {
      if (relationship.from !== current.entityId || relationship.status === "historical") continue;
      if (!predicate(relationship) || visited.has(relationship.to)) continue;
      visited.add(relationship.to);
      queue.push({ entityId: relationship.to, path: [...current.path, relationship] });
    }
  }

  return null;
}

function pathLabel(corpus, path) {
  if (!path) return null;
  return path
    .map(({ to }) => {
      const entity = corpus.getEntity(to);
      return entity?.ticker ?? entity?.displayName ?? to;
    })
    .join(" → ");
}

function groupMemberIds(corpus) {
  return new Set(corpus.relationships
    .filter(({ kind, status }) => kind === "group_membership" && status !== "historical")
    .map(({ to }) => to));
}

function networkRows(corpus) {
  const subjectId = corpus.manifest.subjectEntityId;
  const members = groupMemberIds(corpus);

  return corpus.entities
    .filter(({ kind, scopeRole }) => kind === "listed_company" && scopeRole !== "boundary")
    .map((entity) => {
      const ownershipPath = findDirectedPath(
        corpus,
        subjectId,
        entity.id,
        ({ kind, scope }) => scope === "empire" && OWNERSHIP_KINDS.has(kind),
      );
      const controlPath = findDirectedPath(
        corpus,
        subjectId,
        entity.id,
        ({ control, scope }) => scope === "empire" && control === "controlling",
      );
      const upstream = corpus.relationships.filter(({ to, status }) => to === entity.id && status !== "historical");
      const gaps = corpus.facts
        .filter(({ entityId, kind }) => entityId === entity.id && kind === "data_gap")
        .map(({ label }) => label);

      let role = "ownership-connected";
      if (controlPath) role = "control path";
      else if (!ownershipPath && members.has(entity.id)) role = "affiliation overlap";
      else if (!ownershipPath) role = "downstream of overlap";

      return {
        ticker: entity.ticker,
        company: entity.displayName,
        baritoGroupMember: members.has(entity.id),
        role,
        ownershipPath: pathLabel(corpus, ownershipPath),
        controlPath: pathLabel(corpus, controlPath),
        upstreamListedOwners: upstream
          .map(({ from }) => corpus.getEntity(from))
          .filter(({ kind }) => kind === "listed_company")
          .map(({ ticker }) => ticker),
        upstreamPrivateOwners: upstream
          .map(({ from }) => corpus.getEntity(from))
          .filter(({ kind }) => kind === "private_company")
          .map(({ displayName }) => displayName),
        dataGaps: gaps,
      };
    })
    .sort((first, second) => first.ticker.localeCompare(second.ticker));
}

function valuationRows(corpus) {
  return corpus.entities
    .filter(({ kind, scopeRole }) => kind === "listed_company" && scopeRole !== "boundary")
    .map((entity) => {
      const facts = corpus.getEntityProfile(entity.id).facts;
      const groups = groupProfileFacts(facts);
      const valuations = [...(groups.valuation_period ?? [])]
        .sort((first, second) => first.year - second.year);
      const financials = [...(groups.financial_year ?? [])].sort((first, second) => first.year - second.year);
      const measurements = new Map((groups.measurement ?? []).map((measurement) => [measurement.metric, measurement.value]));
      const latestValuation = valuations.at(-1);
      const priorValuation = valuations.at(-2);
      const latestFinancial = financials.at(-1);
      const priorFinancial = financials.at(-2);
      const quarterlyEarningsGrowth = measurements.get("yoy_quarter_earnings_growth") ?? null;
      const annualEarningsGrowth = latestFinancial && priorFinancial
        ? percentChange(latestFinancial.earnings, priorFinancial.earnings)
        : null;

      return {
        ticker: entity.ticker,
        latestPeYear: latestValuation?.year ?? null,
        latestPe: latestValuation?.pe ?? null,
        priorPeYear: priorValuation?.year ?? null,
        priorPe: priorValuation?.pe ?? null,
        peChangePercent: percentChange(latestValuation?.pe, priorValuation?.pe),
        peerPe: latestValuation?.peerPe ?? null,
        peerPremiumPercent: latestValuation?.peerPe > 0
          ? percentChange(latestValuation.pe, latestValuation.peerPe)
          : null,
        financialYear: latestFinancial?.year ?? null,
        quarterlyRevenueGrowthPercent: measurements.get("yoy_quarter_revenue_growth") ?? null,
        quarterlyEarningsGrowthPercent: quarterlyEarningsGrowth,
        annualEarningsGrowthPercent: annualEarningsGrowth,
        freeCashFlow: latestFinancial?.freeCashFlow ?? null,
        freeCashFlowConversionPercent: latestFinancial?.earnings && latestFinancial.earnings !== 0
          ? latestFinancial.freeCashFlow / Math.abs(latestFinancial.earnings) * 100
          : null,
        totalDebt: latestFinancial?.totalDebt ?? null,
      };
    })
    .sort((first, second) => first.ticker.localeCompare(second.ticker));
}

export function analyzeEmpire(corpus) {
  const network = networkRows(corpus);
  const valuations = valuationRows(corpus);
  return {
    manifest: {
      empireId: corpus.manifest.id,
      name: corpus.manifest.name,
      asOf: corpus.manifest.asOf,
      dataPolicy: corpus.manifest.dataPolicy,
    },
    summary: {
      listedCompanies: network.length,
      groupMembers: network.filter(({ baritoGroupMember }) => baritoGroupMember).length,
      companiesWithOwnershipPath: network.filter(({ ownershipPath }) => ownershipPath).length,
      companiesWithControlPath: network.filter(({ controlPath }) => controlPath).length,
      affiliationOverlaps: network.filter(({ role }) => role === "affiliation overlap").length,
      companiesWithTwoPePeriods: valuations.filter(({ latestPe, priorPe }) => latestPe !== null && priorPe !== null).length,
    },
    network,
    valuations,
  };
}

async function main() {
  const directory = process.argv[2] ?? "data/empires/prajogo";
  const corpus = await loadEmpireCorpus(resolve(directory));
  process.stdout.write(`${JSON.stringify(analyzeEmpire(corpus), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
