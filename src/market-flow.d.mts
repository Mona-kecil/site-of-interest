import type { Infer } from "convex/values";
import type { brokerDayInput } from "../convex/schema";

export function normalizeTicker(value: unknown): string;

export function parseBrokerDays(
  raw: unknown,
  context: { ticker: string; endpoint: string; retrievedAt: string },
): Array<
  Omit<Infer<typeof brokerDayInput>, "empireSlug"> & {
    schemaVersion: 1;
    kind: "broker_day";
  }
>;
