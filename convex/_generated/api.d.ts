/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as companies from "../companies.js";
import type * as companyProfile from "../companyProfile.js";
import type * as empireDirectory from "../empireDirectory.js";
import type * as empires from "../empires.js";
import type * as focus from "../focus.js";
import type * as fundamentalSignals from "../fundamentalSignals.js";
import type * as news from "../news.js";
import type * as seed from "../seed.js";
import type * as universe from "../universe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  companies: typeof companies;
  companyProfile: typeof companyProfile;
  empireDirectory: typeof empireDirectory;
  empires: typeof empires;
  focus: typeof focus;
  fundamentalSignals: typeof fundamentalSignals;
  news: typeof news;
  seed: typeof seed;
  universe: typeof universe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
