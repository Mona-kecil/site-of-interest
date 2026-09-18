import { resolve } from "node:path";
import { loadEmpireCorpus } from "../src/load-empire-corpus.mjs";

const directory = resolve(process.argv[2] ?? "data/empires/prajogo");

try {
  const corpus = await loadEmpireCorpus(directory);
  const path = corpus.findPath(corpus.manifest.subjectEntityId, "sini");
  if (!path) throw new Error("Required Sectors-backed path from the subject to SINI was not found");

  console.log(`Valid corpus: ${corpus.manifest.name} (${corpus.manifest.asOf})`);
  console.log(`${corpus.entities.length} entities · ${corpus.relationships.length} relationships · ${corpus.assertions.length} assertions · ${corpus.facts.length} profile facts · ${corpus.sources.length} sources`);
  console.log("\nDemonstration path:");

  let currentEntity = corpus.getEntity(corpus.manifest.subjectEntityId);
  console.log(`  ${currentEntity.displayName}`);
  for (const relationship of path) {
    const nextEntity = corpus.getEntity(relationship.to);
    const evidence = corpus.getRelationshipEvidence(relationship.id);
    console.log(`  └─ ${relationship.kind} [${relationship.status}] → ${nextEntity.displayName}`);
    for (const assertion of evidence) {
      const label = assertion.type === "party_claim" ? `claim by ${corpus.getEntity(assertion.speakerEntityId).displayName}` : assertion.type;
      console.log(`     ${label}: ${assertion.statement}`);
    }
    currentEntity = nextEntity;
  }

  const frontierCounts = corpus.coverage.reduce((counts, entry) => {
    counts[entry.frontier.status] = (counts[entry.frontier.status] ?? 0) + 1;
    return counts;
  }, {});
  console.log("\nResearch frontier:");
  console.log(`  ${Object.entries(frontierCounts).map(([status, count]) => `${status}=${count}`).join(" · ")}`);
  console.log(`  CUAN open areas: ${corpus.getCoverageGaps("cuan").map(({ area, status }) => `${area} (${status})`).join(", ")}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
