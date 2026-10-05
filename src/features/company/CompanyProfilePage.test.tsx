import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { getFunctionName } from "convex/server";
import manifest from "../../../data/universe/manifest.json";
import { CompanyProfilePage } from "./CompanyProfilePage";
import type { CompanyProfile, ProfileCheck } from "./profile-model";
import type { companyNetwork } from "../owners/network";

const { useQuery, profileQuery, networkQuery, historyPush } = vi.hoisted(() => ({
  useQuery: vi.fn(),
  profileQuery: vi.fn(),
  networkQuery: vi.fn(),
  historyPush: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useQuery: (query: Parameters<typeof getFunctionName>[0], args: unknown) => {
    useQuery(query, args);
    return getFunctionName(query) === "companyProfile:get"
      ? profileQuery(query, args)
      : networkQuery(query, args);
  },
}));
vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({ useParams: () => ({ ticker: "bbca" }) }),
  useRouter: () => ({ history: { push: historyPush } }),
  Link: ({
    to,
    params = {},
    children,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a href={to.replace(/\$(\w+)/g, (_, key: string) => encodeURIComponent(params[key]))}>
      {children}
    </a>
  ),
}));

const sourceIds = Object.fromEntries(manifest.groups.map(({ id }) => [id, "page"]));

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
        sourceId: "universe-01-0",
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
      sourceIds,
      checks: [check],
    },
    years: [
      {
        _id: "year" as Id<"companyYears">,
        _creationTime: 0,
        symbol: "BBCA",
        year: 2025,
        values: { revenue: 0, ebit: null },
        sourceIds,
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
        id: "universe-01-0",
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
  profileQuery.mockReset();
  networkQuery.mockReset();
  historyPush.mockReset();
});

describe("Company profile page", () => {
  it("renders loading and not-found states with a return link", () => {
    profileQuery.mockReturnValue(undefined);
    const view = render(<CompanyProfilePage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading company measurements for BBCA");
    profileQuery.mockReturnValue(null);
    view.rerender(<CompanyProfilePage />);
    expect(screen.getByRole("heading", { name: "Company not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Screener" })).toHaveAttribute(
      "href",
      "/universe",
    );
  });

  it("renders bank checks and expands every sourced input, including a null value", () => {
    profileQuery.mockReturnValue(profile("Banks"));
    const { container } = render(<CompanyProfilePage />);
    expect(useQuery.mock.calls[0][1]).toEqual({ symbol: "bbca" });
    expect(screen.getByRole("heading", { name: "Banks" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "ROIC" })).not.toBeInTheDocument();
    const verdict = screen.getByRole("region", { name: "Not enough data" });
    expect(verdict).toHaveTextContent("Cash: Not checked");
    expect(verdict).toHaveTextContent("Returns: No data");
    expect(verdict).toHaveTextContent("NPL ratio 2.00% · passes at 3% or less");
    expect(
      within(verdict).getByRole("link", { name: "See balance sheet details" }),
    ).toHaveAttribute("href", "#profile-banks");
    expect(verdict.nextElementSibling).toHaveAccessibleName("Track record and forecasts");
    const card = container.querySelector('[data-check="npl_ratio"]')!;
    expect(card.querySelector(".profile-check-value > strong")).toHaveTextContent("2.00%");
    expect(card.querySelector(".profile-check-value > small")).toHaveTextContent("2025");
    expect(card.querySelector(".profile-check-rank")).toHaveTextContent(
      "No other banks have this figure.",
    );
    fireEvent.click(within(card as HTMLElement).getByText("How it’s calculated"));
    expect(
      within(card as HTMLElement).getByText("Non-performing loans divided by gross loans."),
    ).toBeVisible();
    expect(within(card as HTMLElement).getByText("Non-performing loans, 2025")).toBeVisible();
    expect(
      within(card as HTMLElement).getByText("Source: Sectors, retrieved 2 Oct 2026."),
    ).toBeVisible();
    expect(within(card as HTMLElement).getByText("No data", { exact: true })).toBeVisible();
  });

  it("retains seven annual rows and eight quarterly rows with explicit gaps", () => {
    profileQuery.mockReturnValue(profile("Insurance"));
    render(<CompanyProfilePage />);
    expect(
      screen.getByText(
        "Some checks are built for non-financial companies, so they’re left out for Insurance.",
      ),
    ).toBeInTheDocument();
    const annual = screen.getByRole("region", { name: "Returns, yearly figures" });
    expect(within(annual).getAllByRole("row")).toHaveLength(8);
    const latest = within(annual).getAllByRole("row").at(-1)!;
    expect(
      within(latest)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["0.00", "No data", "No data"]);
    const quarters = screen.getByRole("region", { name: "Last eight quarters" });
    expect(within(quarters).getAllByRole("row")).toHaveLength(9);
    expect(within(quarters).getAllByRole("row")[1]).toHaveTextContent("Q3 2024No data");
    expect(screen.getByText("No shareholder data.")).toBeInTheDocument();
  });
  it("displays dividends as IDR per share in history and sourced evidence", () => {
    const data = profile("Banks");
    data.years[0].values.totalDividend = 184;
    data.checks[0].inputs = [
      {
        key: "totalDividend",
        field: "total_dividend[2025]",
        period: "2025",
        value: 184,
        sourceId: "universe-01-0",
      },
    ];
    profileQuery.mockReturnValue(data);
    render(<CompanyProfilePage />);
    const history = screen.getByRole("region", {
      name: "Price against own history, yearly figures",
    });
    expect(
      within(history).getByRole("columnheader", { name: "Dividend per share" }),
    ).toBeInTheDocument();
    expect(history).toHaveTextContent("IDR 184.00 per share");
    fireEvent.click(
      within(document.querySelector('[data-check="npl_ratio"]') as HTMLElement).getByText(
        "How it’s calculated",
      ),
    );
    expect(screen.getByText("Dividend per share, 2025")).toBeVisible();
    expect(screen.getAllByText("IDR 184.00 per share")).toHaveLength(2);
  });
  it("shows a gap category without a peer line and retains the human reason", () => {
    const data = profile("Banks");
    data.checks[0] = {
      ...data.checks[0],
      value: null,
      percentile: null,
      gap: "Not reported: non_performing_loan[2025]",
    };
    profileQuery.mockReturnValue(data);
    const { container } = render(<CompanyProfilePage />);
    const card = container.querySelector('[data-check="npl_ratio"]')!;
    expect(card.querySelector(".profile-check-value > strong")).toHaveTextContent("No data");
    expect(card.querySelector(".profile-check-rank")).toBeNull();
    expect(card).toHaveTextContent("No data for non-performing loans 2025.");
  });

  it("shows the plain cash calculation with its IDR input and source date", () => {
    const data = profile("Industrial Goods");
    data.checks[0].inputs = [
      {
        key: "operatingCashFlow",
        field: "operating_cash_flow[2023]",
        period: "2023",
        value: 19364410000000,
        sourceId: "universe-01-0",
      },
    ];
    profileQuery.mockReturnValue(data);
    render(<CompanyProfilePage />);
    fireEvent.click(
      within(document.querySelector('[data-check="cash_conversion"]') as HTMLElement).getByText(
        "How it’s calculated",
      ),
    );
    expect(screen.getByText("Operating cash flow, 2023")).toBeVisible();
    expect(screen.getByText("IDR 19,364.41 bn")).toBeVisible();
    expect(
      screen.getByText(
        "Operating cash flow divided by earnings, each added up over three years. Above 1× means more cash came in than profit was booked.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Source: Sectors, retrieved 2 Oct 2026.")).toBeVisible();
  });

  it("links the company network to shareholders, their other companies and its holdings", () => {
    profileQuery.mockReturnValue(profile("Banks"));
    const data: Parameters<typeof companyNetwork>[0] = {
      symbol: "BBCA",
      name: "Bank Central Asia",
      ownerKey: "bank central asia",
      holders: [
        {
          key: "parent",
          name: "Parent",
          kind: "holder",
          listedSymbol: null,
          percentage: 0.5,
          others: [{ symbol: "OTHER", name: "Other Company", percentage: 0.3 }],
          otherCount: 1,
        },
      ],
      holdings: [{ symbol: "SUBS", name: "Subsidiary", percentage: 0.6 }],
      holdingCount: 1,
    };
    networkQuery.mockReturnValue(data);
    render(<CompanyProfilePage />);
    expect(networkQuery).toHaveBeenCalledWith(expect.anything(), { symbol: "BBCA" });
    const network = screen.getByRole("region", { name: "Who owns BBCA" });
    const links = within(network).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href")).sort()).toEqual([
      "/company/BBCA",
      "/company/OTHER",
      "/company/SUBS",
      "/owner/parent",
    ]);
    expect(within(network).getByText("50.00%", { exact: true })).toBeInTheDocument();
    expect(within(network).getByText("60.00%", { exact: true })).toBeInTheDocument();
    fireEvent.click(links.find((link) => link.getAttribute("href") === "/company/OTHER")!);
    expect(historyPush).toHaveBeenCalledWith("/company/OTHER");
  });
});
