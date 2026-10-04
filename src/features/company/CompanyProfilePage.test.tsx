import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { CompanyProfilePage } from "./CompanyProfilePage";
import type { CompanyProfile, ProfileCheck } from "./profile-model";

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("convex/react", () => ({ useQuery }));
vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({ useParams: () => ({ ticker: "bbca" }) }),
}));

function profile(subSector: string): CompanyProfile {
  const check: ProfileCheck = {
    _id: "check" as Id<"checkResults">,
    _creationTime: 0,
    symbol: "BBCA",
    subSector,
    checkId: subSector === "Banks" ? "npl_ratio" : "cash_conversion",
    period: "FY2025",
    value: 0.02,
    percentile: 0.84,
    peerCount: 31,
    gap: null,
    inputs: [
      {
        key: "nonPerformingLoan",
        field: "non_performing_loan[2025]",
        period: "2025",
        value: null,
        sourceId: "page",
      },
    ],
  };
  return {
    company: {
      _id: "company" as Id<"companies">,
      _creationTime: 0,
      symbol: "BBCA",
      name: "Bank Central Asia",
      sector: "Financials",
      subSector,
      industry: subSector,
      subIndustry: subSector,
      listingBoard: "Main",
      listingDate: "2000-05-31",
      indices: ["LQ45"],
      affiliates: ["Hartono"],
      current: { marketCap: 700e12, freeFloat: 0.4, peTtm: 12, pbMrq: 2 },
      sourceIds: { profile: "page" },
      checks: [],
    },
    years: [
      {
        _id: "year" as Id<"companyYears">,
        _creationTime: 0,
        symbol: "BBCA",
        year: 2025,
        values: { revenue: 0, ebit: null },
        sourceIds: { annual: "page" },
      },
    ],
    quarters: [],
    holdings: [],
    checks: [check],
    peers: [
      {
        checkId: check.checkId,
        values: [
          { symbol: "BBCA", value: 0.02 },
          { symbol: "OTHER", value: null },
        ],
      },
    ],
    sources: [
      {
        id: "page",
        title: "Stored annual source",
        endpoint: "/v2/companies/?offset=0",
        retrievedAt: "2026-10-02T09:56:37.757Z",
      },
    ],
  };
}

afterEach(() => {
  cleanup();
  useQuery.mockReset();
});

describe("Company profile page", () => {
  it("renders loading and not-found states with a return link", () => {
    useQuery.mockReturnValue(undefined);
    const view = render(<CompanyProfilePage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading company measurements for BBCA");
    useQuery.mockReturnValue(null);
    view.rerender(<CompanyProfilePage />);
    expect(screen.getByRole("heading", { name: "Company not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Universe" })).toHaveAttribute(
      "href",
      "/universe",
    );
  });

  it("renders bank checks and expands every sourced input, including a null value", () => {
    useQuery.mockReturnValue(profile("Banks"));
    const { container } = render(<CompanyProfilePage />);
    expect(useQuery.mock.calls[0][1]).toEqual({ symbol: "bbca" });
    expect(screen.getByRole("heading", { name: "Banks" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "ROIC" })).not.toBeInTheDocument();
    const card = container.querySelector('[data-check="npl_ratio"]')!;
    expect(card.querySelector("header > strong")).toHaveTextContent("2.00%");
    expect(card).toHaveTextContent("p84 · 31 peers");
    expect(within(card as HTMLElement).getByText("Not reported: 1 peer")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Formula and inputs · NPL ratio"));
    expect(
      within(card as HTMLElement).getByText("non_performing_loan[2025] / gross_loan[2025]"),
    ).toBeVisible();
    expect(within(card as HTMLElement).getByText("non_performing_loan[2025]")).toBeVisible();
    expect(within(card as HTMLElement).getByText("Stored annual source")).toBeVisible();
    expect(within(card as HTMLElement).getByText("/v2/companies/?offset=0")).toBeVisible();
    expect(within(card as HTMLElement).getByText("2026-10-02T09:56:37.757Z")).toBeVisible();
    expect(within(card as HTMLElement).getByText("Not reported", { exact: true })).toBeVisible();
  });

  it("retains seven annual rows and eight quarterly rows with explicit gaps", () => {
    useQuery.mockReturnValue(profile("Insurance"));
    render(<CompanyProfilePage />);
    expect(
      screen.getByText("Non-financial checks do not apply to its sub-sector (Insurance)."),
    ).toBeInTheDocument();
    const annual = screen.getByRole("region", { name: "Returns annual history · 2019–2025" });
    expect(within(annual).getAllByRole("row")).toHaveLength(8);
    const latest = within(annual).getAllByRole("row").at(-1)!;
    expect(
      within(latest)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["0.00", "Not reported", "Not reported"]);
    const quarters = screen.getByRole("region", { name: "Eight quarters · Q3-2024–Q2-2026" });
    expect(within(quarters).getAllByRole("row")).toHaveLength(9);
    expect(within(quarters).getAllByRole("row")[1]).toHaveTextContent("Q3-2024Not reported");
    expect(screen.getByText("Holdings not reported.")).toBeInTheDocument();
  });
});
