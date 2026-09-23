import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    SECTORS_API_KEY: v.optional(v.string()),
    FLOW_FETCH_ENABLED: v.optional(v.string()),
  },
});
