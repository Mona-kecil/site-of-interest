import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import schema from "./schema";

export const catalog = query({
  args: {},
  returns: v.object({
    latestDate: v.union(v.string(), v.null()),
    metrics: v.array(v.object({ id: v.string(), label: v.string(), unit: v.string() })),
    periods: v.array(v.string()),
    empires: v.array(v.object({ slug: v.string(), name: v.string() })),
  }),
  handler: async (ctx) => {
    const [signals, empires] = await Promise.all([
      ctx.db.query("fundamentalSignals").withIndex("by_as_of").order("desc").take(1_000),
      ctx.db.query("empires").withIndex("by_slug").take(40),
    ]);
    const metrics = new Map(
      signals.map((signal) => [signal.metricId, { label: signal.metricLabel, unit: signal.unit }]),
    );
    return {
      latestDate: signals[0]?.asOf ?? null,
      metrics: [...metrics]
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      periods: [...new Set(signals.map((signal) => signal.period))].sort().reverse(),
      empires: empires.map((empire) => ({ slug: empire.slug, name: empire.name })),
    };
  },
});

export const list = query({
  args: {
    start: v.string(),
    end: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(schema.doc("fundamentalSignals")),
  handler: async (ctx, args) =>
    ctx.db
      .query("fundamentalSignals")
      .withIndex("by_as_of", (index) => index.gte("asOf", args.start).lte("asOf", args.end))
      .order("desc")
      .paginate(args.paginationOpts),
});

export const compare = query({
  args: {
    metricId: v.string(),
    period: v.string(),
    unit: v.string(),
    start: v.string(),
    end: v.string(),
    empireSlug: v.union(v.string(), v.null()),
  },
  returns: v.array(schema.doc("fundamentalSignals")),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fundamentalSignals")
      .withIndex("by_metric_id_and_period_and_unit_and_value", (index) =>
        index.eq("metricId", args.metricId).eq("period", args.period).eq("unit", args.unit),
      )
      .take(500);
    return rows.filter(
      (row) =>
        row.asOf >= args.start &&
        row.asOf <= args.end &&
        (args.empireSlug === null || row.empireSlug === args.empireSlug),
    );
  },
});

export const detail = query({
  args: { empireSlug: v.string(), stableId: v.string() },
  returns: v.union(
    v.object({ signal: schema.doc("fundamentalSignals"), sources: v.array(schema.doc("sources")) }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const signal = await ctx.db
      .query("fundamentalSignals")
      .withIndex("by_empire_and_stable_id", (index) =>
        index.eq("empireSlug", args.empireSlug).eq("stableId", args.stableId),
      )
      .unique();
    if (signal === null) return null;
    const sourceIds = new Set(
      signal.inputs.flatMap((input) => input.sourceRefs.map((ref) => ref.sourceId)),
    );
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_empire", (index) => index.eq("empireSlug", args.empireSlug))
      .take(500);
    return { signal, sources: sources.filter((source) => sourceIds.has(source.stableId)) };
  },
});

export const byCompany = query({
  args: { empireSlug: v.string(), ticker: v.string() },
  returns: v.array(schema.doc("fundamentalSignals")),
  handler: async (ctx, args) =>
    ctx.db
      .query("fundamentalSignals")
      .withIndex("by_empire_and_ticker", (index) =>
        index.eq("empireSlug", args.empireSlug).eq("ticker", args.ticker),
      )
      .take(500),
});
