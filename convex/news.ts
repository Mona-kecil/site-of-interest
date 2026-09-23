import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import schema from "./schema";

export const list = query({
  args: { start: v.string(), end: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("newsRecords")),
  handler: async (ctx, args) =>
    ctx.db
      .query("newsRecords")
      .withIndex("by_published_at", (index) =>
        index.gte("publishedAt", args.start).lte("publishedAt", `${args.end}T23:59:59`),
      )
      .order("desc")
      .paginate(args.paginationOpts),
});

export const detail = query({
  args: { empireSlug: v.string(), stableId: v.string() },
  returns: v.union(schema.doc("newsRecords"), v.null()),
  handler: async (ctx, args) =>
    ctx.db
      .query("newsRecords")
      .withIndex("by_empire_and_stable_id", (index) =>
        index.eq("empireSlug", args.empireSlug).eq("stableId", args.stableId),
      )
      .unique(),
});

export const coverage = query({
  args: { empireSlug: v.string() },
  returns: v.union(schema.doc("newsCoverage"), v.null()),
  handler: async (ctx, args) =>
    ctx.db
      .query("newsCoverage")
      .withIndex("by_empire", (index) => index.eq("empireSlug", args.empireSlug))
      .unique(),
});

export const byCompany = query({
  args: { empireSlug: v.string(), ticker: v.string() },
  returns: v.array(schema.doc("newsRecords")),
  handler: async (ctx, args) => {
    const recent = await ctx.db
      .query("newsRecords")
      .withIndex("by_empire_and_published_at", (index) => index.eq("empireSlug", args.empireSlug))
      .order("desc")
      .take(200);
    return recent.filter((item) => item.matchedTickers.includes(args.ticker)).slice(0, 40);
  },
});
