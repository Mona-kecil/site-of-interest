import { mutation } from "./_generated/server";
import { type Infer } from "convex/values";
import assertions from "../data/empires/prajogo/assertions.json";
import coverage from "../data/empires/prajogo/coverage.json";
import entities from "../data/empires/prajogo/entities.json";
import facts from "../data/empires/prajogo/facts.json";
import manifest from "../data/empires/prajogo/manifest.json";
import relationships from "../data/empires/prajogo/relationships.json";
import sources from "../data/empires/prajogo/sources.json";
import { companyFact } from "./schema";

const slug = "prajogo";
const empireTables: Array<
  | "companyCoverage"
  | "companyFacts"
  | "relationshipAssertions"
  | "relationships"
  | "sources"
  | "entities"
> = [
  "companyCoverage",
  "companyFacts",
  "relationshipAssertions",
  "relationships",
  "sources",
  "entities",
];

type CompanyFact = Infer<typeof companyFact>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  return value;
}

function requireNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== "number") throw new Error(`${field} must be a number`);
  return value;
}

function optionalNumber(record: Record<string, unknown>, field: string): number | undefined {
  if (!(field in record)) return undefined;
  return requireNumber(record, field);
}

function nullableNumber(record: Record<string, unknown>, field: string): number | null {
  if (record[field] === null) return null;
  return requireNumber(record, field);
}

function parseSourceRefs(record: Record<string, unknown>) {
  const refs = record.sourceRefs;
  if (!Array.isArray(refs)) throw new Error("sourceRefs must be an array");
  return refs.map((ref) => {
    const sourceRef = requireRecord(ref, "sourceRef");
    return {
      sourceId: requireString(sourceRef, "sourceId"),
      locator: requireString(sourceRef, "locator"),
    };
  });
}

function parseFact(value: unknown): CompanyFact {
  const fact = requireRecord(value, "fact");
  const common = {
    id: requireString(fact, "id"),
    entityId: requireString(fact, "entityId"),
    asOf: requireString(fact, "asOf"),
    context: requireString(fact, "context"),
    sourceRefs: parseSourceRefs(fact),
  };

  switch (requireString(fact, "kind")) {
    case "profile_metric":
      return {
        ...common,
        kind: "profile_metric",
        label: requireString(fact, "label"),
        value: requireNumber(fact, "value"),
        unit: requireString(fact, "unit"),
      };
    case "financial_year":
      return {
        ...common,
        kind: "financial_year",
        year: requireNumber(fact, "year"),
        revenue: requireNumber(fact, "revenue"),
        earnings: requireNumber(fact, "earnings"),
        operatingCashFlow: requireNumber(fact, "operatingCashFlow"),
        freeCashFlow: requireNumber(fact, "freeCashFlow"),
        totalAssets: optionalNumber(fact, "totalAssets"),
        totalDebt: optionalNumber(fact, "totalDebt"),
        capitalExpenditure: optionalNumber(fact, "capitalExpenditure"),
        unit: requireString(fact, "unit"),
      };
    case "valuation_period":
      return {
        ...common,
        kind: "valuation_period",
        year: requireNumber(fact, "year"),
        pe: nullableNumber(fact, "pe"),
        peerPe: nullableNumber(fact, "peerPe"),
      };
    case "signal":
      return {
        ...common,
        kind: "signal",
        metric: requireString(fact, "metric"),
        label: requireString(fact, "label"),
        value: requireNumber(fact, "value"),
        unit: requireString(fact, "unit"),
        tone: requireString(fact, "tone"),
      };
    case "data_gap":
      return {
        ...common,
        kind: "data_gap",
        label: requireString(fact, "label"),
      };
    default:
      throw new Error(`Unknown company fact kind: ${String(fact.kind)}`);
  }
}

export const replacePrajogo = mutation({
  args: {},
  handler: async (ctx) => {
    const existingEmpire = await ctx.db
      .query("empires")
      .withIndex("by_slug", (index) => index.eq("slug", slug))
      .unique();

    for (const table of empireTables) {
      const documents = await ctx.db
        .query(table)
        .withIndex("by_empire", (index) => index.eq("empireSlug", slug))
        .take(1_000);
      for (const document of documents) await ctx.db.delete(document._id);
    }

    if (existingEmpire !== null) await ctx.db.delete(existingEmpire._id);

    await ctx.db.insert("empires", {
      slug,
      corpusId: manifest.id,
      name: manifest.name,
      subjectEntityId: manifest.subjectEntityId,
      jurisdiction: manifest.jurisdiction,
      asOf: manifest.asOf,
      status: manifest.status,
      scope: manifest.scope,
      dataPolicy: manifest.dataPolicy,
      coverageAreas: manifest.coverageAreas,
    });

    for (const entity of entities) {
      await ctx.db.insert("entities", {
        empireSlug: slug,
        stableId: entity.id,
        kind: entity.kind,
        displayName: entity.displayName,
        country: entity.country,
        summary: entity.summary,
        ticker: entity.ticker,
        exchange: entity.exchange,
        scopeRole: entity.scopeRole,
      });
    }

    for (const relationship of relationships) {
      await ctx.db.insert("relationships", {
        empireSlug: slug,
        stableId: relationship.id,
        fromEntityId: relationship.from,
        toEntityId: relationship.to,
        kind: relationship.kind,
        directness: relationship.directness,
        control: relationship.control,
        scope: relationship.scope,
        status: relationship.status,
        lastVerifiedAt: relationship.lastVerifiedAt,
        metrics: relationship.metrics,
      });
    }

    for (const assertion of assertions) {
      await ctx.db.insert("relationshipAssertions", {
        empireSlug: slug,
        stableId: assertion.id,
        relationshipId: assertion.relationshipId,
        type: assertion.type,
        stance: assertion.stance,
        statement: assertion.statement,
        asOf: assertion.asOf,
        confidence: assertion.confidence,
        sourceRefs: assertion.sourceRefs,
      });
    }

    for (const source of sources) {
      await ctx.db.insert("sources", {
        empireSlug: slug,
        stableId: source.id,
        title: source.title,
        publisher: source.publisher,
        provider: source.provider,
        kind: source.kind,
        authority: source.authority,
        retrievedAt: source.retrievedAt,
        url: source.url,
      });
    }

    for (const rawFact of facts) {
      const fact = parseFact(rawFact);
      await ctx.db.insert("companyFacts", {
        empireSlug: slug,
        entityId: fact.entityId,
        stableId: fact.id,
        fact,
      });
    }

    for (const company of coverage) {
      await ctx.db.insert("companyCoverage", {
        empireSlug: slug,
        entityId: company.entityId,
        frontier: company.frontier,
        checks: company.checks,
      });
    }

    return {
      slug,
      entities: entities.length,
      relationships: relationships.length,
      assertions: assertions.length,
      sources: sources.length,
      facts: facts.length,
      coverage: coverage.length,
    };
  },
});
