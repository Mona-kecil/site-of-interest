import { describe, expect, it } from "vitest";
import { deriveCycleState } from "./legacy-company-model";
import {
  fundamentalCycle,
  fundamentalGaps,
  orderFundamentalRows,
  peerPremium,
  type FundamentalRow,
} from "./fundamental-model";

const sourceRefs = [{ sourceId: "report", locator: "valuation.pe" }];
function metric(value: number) {
  return {
    value,
    unit: "percent",
    period: "latest",
    asOf: "2026-09-17",
    factId: "fact",
    sourceRefs,
    context: "Stored provider fact",
  };
}

function row(
  ticker: string,
  revenue: number | null,
  earnings: number | null,
  peer: number | null,
): FundamentalRow {
  return {
    empireSlug: "prajogo",
    ticker,
    companyName: ticker,
    fundamentals: {
      pe: metric(20),
      peerPe: peer === null ? null : metric(peer),
      revenueGrowth: revenue === null ? null : metric(revenue),
      earningsGrowth: earnings === null ? null : metric(earnings),
      freeCashFlow: metric(100),
    },
  };
}

describe("Focus research queue", () => {
  it("derives one descriptive growth state for board and company pages", () => {
    expect(deriveCycleState(20, 10)).toBe("both_growing");
    expect(deriveCycleState(20, -10)).toBe("revenue_growing");
    expect(deriveCycleState(-20, 10)).toBe("earnings_growing");
    expect(deriveCycleState(0, -10)).toBe("neither_growing");
    expect(fundamentalCycle(row("CDIA", null, null, 10))).toBe("incomplete");
  });

  it("orders unresolved coverage first and uses growth divergence to break ties", () => {
    const completeA = row("AAAA", 40, -30, 10);
    const completeB = row("BBBB", 10, 5, 10);
    const invalidPeer = row("SSIA", 12, -40, -5);
    const missingGrowth = row("CDIA", null, null, 10);
    expect(
      orderFundamentalRows([completeB, invalidPeer, missingGrowth, completeA], {
        sort: "priority",
        cycle: "all",
        incompleteOnly: false,
      }).map(({ ticker }) => ticker),
    ).toEqual(["CDIA", "SSIA", "AAAA", "BBBB"]);
    expect(
      orderFundamentalRows([completeB, invalidPeer, missingGrowth, completeA], {
        sort: "priority",
        cycle: "all",
        incompleteOnly: true,
      }).map(({ ticker }) => ticker),
    ).toEqual(["CDIA", "SSIA"]);
    expect(
      orderFundamentalRows([completeB, invalidPeer, missingGrowth, completeA], {
        sort: "priority",
        cycle: "revenue_growing",
        incompleteOnly: false,
      }).map(({ ticker }) => ticker),
    ).toEqual(["SSIA", "AAAA"]);
  });

  it("preserves a negative peer P/E fact but leaves the derived premium open", () => {
    const invalidPeer = row("SSIA", 12, -40, -5);
    expect(invalidPeer.fundamentals.peerPe?.value).toBe(-5);
    expect(peerPremium(invalidPeer)).toBeNull();
    expect(fundamentalGaps(invalidPeer)).toContain("Peer premium: peer P/E is zero or negative");
    expect(peerPremium(row("TPIA", 10, 5, 10))).toBe(100);
  });

  it("puts missing values last in numeric sorts", () => {
    const missing = row("CDIA", null, null, 10);
    const falling = row("SSIA", -10, -20, 10);
    const rising = row("TPIA", 40, 10, 10);
    expect(
      orderFundamentalRows([missing, falling, rising], {
        sort: "revenue",
        cycle: "all",
        incompleteOnly: false,
      }).map(({ ticker }) => ticker),
    ).toEqual(["TPIA", "SSIA", "CDIA"]);
  });
});
