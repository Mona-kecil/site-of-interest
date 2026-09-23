import { mutation } from "./_generated/server";
import { type Infer } from "convex/values";
import assertions from "../data/empires/prajogo/assertions.json";
import coverage from "../data/empires/prajogo/coverage.json";
import entities from "../data/empires/prajogo/entities.json";
import facts from "../data/empires/prajogo/facts.json";
import manifest from "../data/empires/prajogo/manifest.json";
import memberships from "../data/empires/prajogo/memberships.json";
import relationships from "../data/empires/prajogo/relationships.json";
import sources from "../data/empires/prajogo/sources.json";
import brokerSnapshot from "../data/broker-snapshot.json";
import marketSnapshot from "../data/market-snapshot.json";
import newsSnapshot from "../data/news-snapshot.json";
import { companyFact, membershipEvidence } from "./schema";
import { v } from "convex/values";
import { buildFundamentalSignals } from "../src/features/today/fundamental-rules";

const slug = "prajogo";
const empireTables: Array<
  | "companyCoverage"
  | "companyFacts"
  | "fundamentalSignals"
  | "brokerDays"
  | "brokerSignals"
  | "marketDays"
  | "marketSignals"
  | "newsRecords"
  | "newsCoverage"
  | "empireMemberships"
  | "relationshipAssertions"
  | "relationships"
  | "sources"
  | "entities"
> = [
  "companyCoverage",
  "companyFacts",
  "fundamentalSignals",
  "brokerDays",
  "brokerSignals",
  "marketDays",
  "marketSignals",
  "newsRecords",
  "newsCoverage",
  "empireMemberships",
  "relationshipAssertions",
  "relationships",
  "sources",
  "entities",
];

type CompanyFact = Infer<typeof companyFact>;
type MembershipEvidence = Infer<typeof membershipEvidence>;

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

function parseMembershipEvidence(value: unknown): MembershipEvidence {
  const item = requireRecord(value, "membership evidence");
  const kind = requireString(item, "kind");
  if (
    kind !== "provider_affiliate" &&
    kind !== "provider_group_label" &&
    kind !== "ownership_path"
  ) {
    throw new Error(`Unknown membership evidence kind: ${kind}`);
  }
  return {
    kind,
    sourceId: requireString(item, "sourceId"),
    locator: requireString(item, "locator"),
  };
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
    case "measurement":
      return {
        ...common,
        kind: "measurement",
        metric: requireString(fact, "metric"),
        label: requireString(fact, "label"),
        value: requireNumber(fact, "value"),
        unit: requireString(fact, "unit"),
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
  returns: v.object({
    slug: v.string(),
    entities: v.number(),
    memberships: v.number(),
    relationships: v.number(),
    assertions: v.number(),
    sources: v.number(),
    facts: v.number(),
    signals: v.number(),
    brokerDays: v.number(),
    brokerSignals: v.number(),
    marketDays: v.number(),
    marketSignals: v.number(),
    newsRecords: v.number(),
    coverage: v.number(),
  }),
  handler: async (ctx) => {
    if (brokerSnapshot.schemaVersion !== 1) throw new Error("Unsupported broker snapshot version");
    if (marketSnapshot.schemaVersion !== 1) throw new Error("Unsupported market snapshot version");
    if (newsSnapshot.schemaVersion !== 1) throw new Error("Unsupported news snapshot version");
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

    for (const membership of memberships) {
      await ctx.db.insert("empireMemberships", {
        empireSlug: slug,
        entityId: membership.entityId,
        ticker: membership.ticker,
        exchange: membership.exchange,
        companyName: membership.companyName,
        evidence: membership.evidence.map(parseMembershipEvidence),
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

    const parsedFacts = facts.map(parseFact);
    for (const fact of parsedFacts) {
      await ctx.db.insert("companyFacts", {
        empireSlug: slug,
        entityId: fact.entityId,
        stableId: fact.id,
        fact,
      });
    }

    let signalCount = 0;
    for (const membership of memberships) {
      const entity = entities.find((item) => item.id === membership.entityId);
      if (!entity) throw new Error(`Missing entity ${membership.entityId}`);
      const signals = buildFundamentalSignals({
        empireSlug: slug,
        entityId: membership.entityId,
        ticker: membership.ticker,
        companyName: membership.companyName,
        summary: entity.summary,
        facts: parsedFacts.filter((fact) => fact.entityId === membership.entityId),
      });
      for (const signal of signals) await ctx.db.insert("fundamentalSignals", signal);
      signalCount += signals.length;
    }

    for (const day of brokerSnapshot.days) {
      if (day.kind !== "broker_day" || day.source.provider !== "sectors") {
        throw new Error("Invalid broker snapshot day");
      }
      await ctx.db.insert("brokerDays", {
        empireSlug: slug,
        ticker: day.ticker,
        tradingDate: day.tradingDate,
        brokers: day.brokers,
        source: { ...day.source, provider: "sectors" },
      });
    }
    for (const signal of brokerSnapshot.signals) {
      if (signal.metricId !== "broker_buy_share" || signal.source.provider !== "sectors") {
        throw new Error("Invalid broker snapshot signal");
      }
      await ctx.db.insert("brokerSignals", {
        ...signal,
        metricId: "broker_buy_share",
        unit: "%",
        source: { ...signal.source, provider: "sectors" },
      });
    }

    for (const day of marketSnapshot.days) {
      if (day.kind !== "market_day" || day.source.provider !== "sectors") {
        throw new Error("Invalid market snapshot day");
      }
      await ctx.db.insert("marketDays", {
        empireSlug: slug,
        ticker: day.ticker,
        tradingDate: day.tradingDate,
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        volume: day.volume,
        marketCap: day.marketCap,
        source: { ...day.source, provider: "sectors" },
      });
    }
    for (const signal of marketSnapshot.signals) {
      if (signal.metricId !== "relative_volume_20" || signal.source.provider !== "sectors") {
        throw new Error("Invalid market snapshot signal");
      }
      await ctx.db.insert("marketSignals", {
        ...signal,
        metricId: "relative_volume_20",
        unit: "x",
        source: { ...signal.source, provider: "sectors" },
        baselineDays: signal.baselineDays.map((day) => ({
          ...day,
          source: { ...day.source, provider: "sectors" },
        })),
      });
    }
    for (const record of newsSnapshot.records) {
      if (record.provider !== "sectors" || record.matchRule !== "provider_symbol_exact") {
        throw new Error("Invalid news snapshot record");
      }
      await ctx.db.insert("newsRecords", {
        ...record,
        provider: "sectors",
        matchRule: "provider_symbol_exact",
      });
    }
    await ctx.db.insert("newsCoverage", {
      empireSlug: slug,
      start: newsSnapshot.query.start,
      end: newsSnapshot.query.end,
      totalCount: newsSnapshot.query.totalCount,
      importedCount: newsSnapshot.records.length,
      truncated: newsSnapshot.query.truncated,
      retrievedAt: newsSnapshot.records[0]?.retrievedAt ?? "",
    });

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
      memberships: memberships.length,
      relationships: relationships.length,
      assertions: assertions.length,
      sources: sources.length,
      facts: facts.length,
      signals: signalCount,
      brokerDays: brokerSnapshot.days.length,
      brokerSignals: brokerSnapshot.signals.length,
      marketDays: marketSnapshot.days.length,
      marketSignals: marketSnapshot.signals.length,
      newsRecords: newsSnapshot.records.length,
      coverage: coverage.length,
    };
  },
});
