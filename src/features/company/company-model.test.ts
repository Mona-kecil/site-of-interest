import { describe, expect, it } from "vitest";
import { deriveCycleLens, formatCompanyValue } from "./company-model";

describe("company intelligence model", () => {
  it("classifies SINI's positive P/E against negative annual earnings", () => {
    const lens = deriveCycleLens(
      [{ year: 2026, pe: 28.068, peerPe: 7.489 }],
      [{ year: 2025, earnings: -43_087_994_671, freeCashFlow: -143_105_167_920 }],
      [{ metric: "yoy_quarter_earnings_growth", value: 46.626 }],
    );

    expect(lens.status).toBe("priced_ahead");
    expect(lens.peerPremium).toBeCloseTo(2.748, 2);
    expect(lens.title).toBe("Recovery priced ahead");
  });

  it("formats market values without losing their sign", () => {
    expect(formatCompanyValue(17_406_187_500_000, "IDR")).toBe("Rp17.41tn");
    expect(formatCompanyValue(-43_087_994_671, "IDR")).toBe("−Rp43.09bn");
    expect(formatCompanyValue(46.6259, "percent")).toBe("46.63%");
  });
});
