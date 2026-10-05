import { describe, expect, it } from "vitest";
import { PILLARS } from "../ideas/ideas-model";
import { checkCopy, peerNoun, rankLine } from "./check-copy";

const rules = PILLARS.flatMap((pillar) => Object.values(pillar.rules).flat());
const ratedChecks = Object.entries(checkCopy).filter(
  ([id, copy]) => copy.better !== null && rules.some((rule) => rule.key === id),
);

describe("check directions", () => {
  it.each(ratedChecks)("agrees with every pillar rule for %s", (id, { better }) => {
    for (const rule of rules.filter((rule) => rule.key === id)) {
      if (rule.pass) {
        const [operator] = rule.pass;
        expect(better).toBe(operator === ">" || operator === ">=" ? "higher" : "lower");
      }
      if (rule.fail) {
        const [operator] = rule.fail;
        expect(better).toBe(operator === "<" || operator === "<=" ? "higher" : "lower");
      }
    }
  });
});

describe("rankLine", () => {
  const peers = [
    { symbol: "LOW", value: 1 },
    { symbol: "MID", value: 2 },
    { symbol: "HIGH", value: 3 },
  ];

  it("describes the top rank", () => {
    expect(rankLine(peers, "HIGH", "higher", "companies")).toBe("Ranks 1st of 3 companies.");
  });

  it("describes a middle rank", () => {
    expect(rankLine(peers, "MID", "higher", "companies")).toBe("Ranks 2nd of 3 companies.");
  });

  it("describes the bottom rank", () => {
    expect(rankLine(peers, "LOW", "higher", "companies")).toBe("Ranks 3rd of 3 companies.");
  });

  it("ranks a lower-is-better check ahead of larger values", () => {
    expect(rankLine(peers, "LOW", "lower", "banks")).toBe("Ranks 1st of 3 banks.");
    expect(rankLine(peers, "HIGH", "lower", "banks")).toBe("Ranks 3rd of 3 banks.");
  });

  it("returns no sentence when the company is absent or its figure is missing", () => {
    expect(rankLine([], "MISSING", "higher", "companies")).toBeNull();
    expect(rankLine(peers, "MISSING", "higher", "companies")).toBeNull();
    expect(rankLine([{ symbol: "LOW", value: null }], "LOW", "higher", "companies")).toBeNull();
  });

  it("says when no other company has a figure", () => {
    expect(rankLine([peers[0]], "LOW", "higher", "companies")).toBe(
      "No other companies have this figure.",
    );
    expect(rankLine([peers[0], { symbol: "MISSING", value: null }], "LOW", "lower", "banks")).toBe(
      "No other banks have this figure.",
    );
  });

  it("counts only other companies with data and names ties", () => {
    expect(
      rankLine(
        [...peers, { symbol: "TIED", value: 2 }, { symbol: "MISSING", value: null }],
        "MID",
        "higher",
        "companies",
      ),
    ).toBe("Ranks 2nd of 4 companies with data, tied with 1 other.");
  });

  it("uses English ordinals past the first few ranks", () => {
    const many = Array.from({ length: 113 }, (_, index) => ({
      symbol: `S${index}`,
      value: -index,
    }));
    expect(
      ["S10", "S11", "S12", "S20", "S21", "S110", "S112"].map(
        (symbol) => rankLine(many, symbol, "higher", "banks")?.split(" ")[1],
      ),
    ).toEqual(["11th", "12th", "13th", "21st", "22nd", "111th", "113th"]);
  });

  it("describes a directionless figure by size rather than as better", () => {
    expect(rankLine(peers, "HIGH", null, "companies")).toBe("Highest of 3 companies.");
    expect(rankLine(peers, "LOW", null, "companies")).toBe("3rd highest of 3 companies.");
  });
});

describe("peerNoun", () => {
  it("names banks, another sub-sector, and an unspecified company group", () => {
    expect(peerNoun("Banks")).toBe("banks");
    expect(peerNoun("Industrial Goods")).toBe("companies in Industrial Goods");
    expect(peerNoun(null)).toBe("companies");
  });
});
