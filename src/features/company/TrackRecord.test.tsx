import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import manifest from "../../../data/universe/manifest.json";
import { TrackRecord } from "./TrackRecord";
import type { CompanyProfile } from "./profile-model";

const statement = {
  operatingCashFlow: 120e9,
  earnings: 100e9,
  freeCashFlow: 50e9,
  ebit: 10e9,
  tax: 5e9,
  earningsBeforeTax: 25e9,
  totalDebt: 50e9,
  totalEquity: 200e9,
  cashAndEquivalents: 50e9,
  ebitda: 20e9,
  interestCoverageRatio: 10,
};

const sourceIds = Object.fromEntries(manifest.groups.map(({ id }) => [id, "page"]));

function profile(subSector: string | null, current: Record<string, number>) {
  return {
    company: { symbol: "TEST", subSector, current, sourceIds },
    years: [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => ({
      year,
      values: year === 2023 ? { ...statement, ebitda: null } : statement,
      sourceIds,
    })),
  } as unknown as CompanyProfile;
}

afterEach(cleanup);

describe("Track record and forecasts", () => {
  it("marks each statement pillar by year and keeps gaps visible", () => {
    render(<TrackRecord profile={profile(null, {})} />);
    const row = (name: string) => screen.getAllByText(name)[0].closest("tr")!;

    expect(row("Cash").textContent).toContain("Passed in 5 of 5 years");
    expect(within(row("Cash conversion, 3 yrs")).getAllByText("1.20×")).toHaveLength(5);
    expect(within(row("Cash")).getAllByText("Passes")).toHaveLength(5);
    expect(within(row("Free cash flow (bn)")).getAllByText("50")).toHaveLength(5);
    expect(row("Returns").textContent).toContain("Passed in 0 of 5 years");
    expect(within(row("ROIC")).getAllByText("4.0%")[0].dataset.result).toBe("fail");

    const gap = within(row("Net debt / EBITDA")).getByText("No data");
    expect(gap.title).toBe("No data for EBITDA 2023.");
    expect(within(row("Balance sheet")).getAllByText("Passes")).toHaveLength(5);
  });

  it("shows analyst estimates apart from the rules and suppresses growth across a loss", () => {
    render(
      <TrackRecord
        profile={profile(null, {
          revenueEstimate2026: 345.72e12,
          revenueGrowth2026: 0.069,
          epsEstimate2026: -0.2,
          epsGrowth2026: 0.81,
          forwardPe: -5.64,
          peTtm: 6.13,
        })}
      />,
    );
    const figure = (label: string) => screen.getByText(label).parentElement!.textContent;

    expect(figure("Revenue, FY2026 estimate")).toBe(
      "Revenue, FY2026 estimateIDR 345,720 bn+6.9% on FY2025",
    );
    expect(figure("EPS, FY2026 estimate")).toBe(
      "EPS, FY2026 estimateIDR -0.20No growth figure across a loss",
    );
    expect(figure("Forward P/E")).toBe("Forward P/ENot meaningfulAnalysts expect a loss");
  });

  it("drops pillars a financial company is not rated on and says when no estimates exist", () => {
    render(<TrackRecord profile={profile("Insurance", {})} />);

    expect(screen.getByText("Returns")).toBeTruthy();
    expect(screen.queryByText("Cash")).toBeNull();
    expect(screen.queryByText("Balance sheet")).toBeNull();
    expect(screen.getByText("Sectors reports no analyst estimates for TEST.")).toBeTruthy();
  });
});
