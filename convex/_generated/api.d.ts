/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as brokerImport from "../brokerImport.js";
import type * as brokerRows from "../brokerRows.js";
import type * as brokerSignals from "../brokerSignals.js";
import type * as companies from "../companies.js";
import type * as empireDirectory from "../empireDirectory.js";
import type * as empires from "../empires.js";
import type * as flow from "../flow.js";
import type * as flowFetch from "../flowFetch.js";
import type * as flowRequest from "../flowRequest.js";
import type * as flowWindow from "../flowWindow.js";
import type * as focus from "../focus.js";
import type * as fundamentalSignals from "../fundamentalSignals.js";
import type * as marketSignals from "../marketSignals.js";
import type * as news from "../news.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  brokerImport: typeof brokerImport;
  brokerRows: typeof brokerRows;
  brokerSignals: typeof brokerSignals;
  companies: typeof companies;
  empireDirectory: typeof empireDirectory;
  empires: typeof empires;
  flow: typeof flow;
  flowFetch: typeof flowFetch;
  flowRequest: typeof flowRequest;
  flowWindow: typeof flowWindow;
  focus: typeof focus;
  fundamentalSignals: typeof fundamentalSignals;
  marketSignals: typeof marketSignals;
  news: typeof news;
  seed: typeof seed;
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
