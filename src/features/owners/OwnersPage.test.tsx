import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { OwnersPage } from "./OwnersPage";
import { OwnerPage } from "./OwnerPage";
import { GroupsPage, GroupPage } from "./GroupsPage";
import type { Owner, OwnerSummary } from "./owners-model";

const { useQuery, useParams } = vi.hoisted(() => ({ useQuery: vi.fn(), useParams: vi.fn() }));
vi.mock("convex/react", () => ({ useQuery }));
vi.mock("@tanstack/react-router", () => ({
  useParams,
  Link: ({
    to,
    params = {},
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => (
    <a
      className={className}
      href={to.replace(/\$(\w+)/g, (_, key: string) => encodeURIComponent(params[key]))}
    >
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  useQuery.mockReset();
  useParams.mockReset();
});

const owners: OwnerSummary[] = [
  {
    key: "astra international",
    name: "PT Astra International Tbk",
    kind: "company",
    listedSymbol: "ASII",
    companyCount: 5,
    totalValue: 100,
    largestHolderCount: 5,
  },
  {
    key: "danantara asset management",
    name: "PT Danantara Asset Management",
    kind: "holder",
    listedSymbol: null,
    companyCount: 13,
    totalValue: null,
    largestHolderCount: 13,
  },
  {
    key: "afiliasi",
    name: "Afiliasi",
    kind: "bucket",
    listedSymbol: null,
    companyCount: 1,
    totalValue: 0,
    largestHolderCount: 0,
  },
];
const holder = {
  key: "parent",
  name: "Parent",
  percentage: 0.5,
  rank: 1,
  isLargest: true,
  value: null,
  shares: null,
  sourceId: "test",
};
const owner: Owner = {
  ...owners[0],
  holdings: [
    {
      symbol: "UNTR",
      reportedName: "PT Astra International Tbk",
      name: "PT United Tractors Tbk",
      percentage: 0.595,
      rank: 1,
      isLargest: true,
      shares: null,
      value: null,
      sourceId: "test",
      subSector: "Industrial Goods",
      marketCap: 100,
      coHolders: [{ ...holder, key: "other", name: "Other holder" }],
    },
  ],
  ownHolders: [holder],
};

describe("owners pages", () => {
  it("searches and sorts the table, switches the listed view, and links both routes", () => {
    useQuery.mockReturnValue(owners);
    render(<OwnersPage />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Danantara");
    fireEvent.click(screen.getByRole("button", { name: "Companies held ↓" }));
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Afiliasi");
    fireEvent.change(screen.getByLabelText("Search owners"), { target: { value: "danantara" } });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "PT Danantara Asset Management" })).toHaveAttribute(
      "href",
      "/owner/danantara%20asset%20management",
    );
    fireEvent.change(screen.getByLabelText("Search owners"), { target: { value: "" } });
    fireEvent.click(
      screen.getByRole("tab", { name: "Listed companies that own listed companies" }),
    );
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "ASII" })).toHaveAttribute("href", "/company/ASII");
  });

  it("shows holdings, co-holders, upstream holders and percentage edges", () => {
    useParams.mockReturnValue({ key: "astra international" });
    useQuery.mockReturnValue(owner);
    render(<OwnerPage />);
    expect(useQuery).toHaveBeenCalledWith(expect.anything(), { key: "astra international" });
    expect(screen.getByRole("link", { name: "ASII company page →" })).toHaveAttribute(
      "href",
      "/company/ASII",
    );
    expect(
      within(screen.getByRole("table", { name: "1 reported holdings" })).getByRole("link", {
        name: "UNTR",
      }),
    ).toHaveAttribute("href", "/company/UNTR");
    fireEvent.click(screen.getByText("1 other entity holders"));
    expect(screen.getByRole("link", { name: "Other holder" })).toHaveAttribute(
      "href",
      "/owner/other",
    );
    expect(screen.getByRole("heading", { name: "Holders of ASII" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Reported ownership links for PT Astra International Tbk",
    );
    expect(document.querySelectorAll(".owners-edge")).toHaveLength(2);
    expect(document.querySelector(".owners-graph")).toHaveTextContent("59.50%");
    expect(document.querySelector(".owners-upstream")).toHaveTextContent("50.00%");
  });

  it("shows the reported name for legal-form and spelling merges, only on differing rows", () => {
    useParams.mockReturnValue({ key: owner.key });
    useQuery.mockReturnValue({
      ...owner,
      holdings: [{ ...owner.holdings[0], reportedName: "PT Astra International Tbk." }],
    });
    const view = render(<OwnerPage />);
    expect(document.querySelector('[data-symbol="UNTR"]')).toHaveTextContent(
      "Reported as PT Astra International Tbk.",
    );
    useParams.mockReturnValue({ key: "edwin soeryadjaya" });
    useQuery.mockReturnValue({
      ...owner,
      key: "edwin soeryadjaya",
      name: "Edwin Soeryadjaya",
      kind: "holder",
      listedSymbol: null,
      ownHolders: [],
      holdings: [
        { ...owner.holdings[0], symbol: "ADRO", reportedName: "Edwin Soeryadjaja" },
        { ...owner.holdings[0], symbol: "MPMX", reportedName: "Edwin Soeryadjaya" },
      ],
    });
    view.rerender(<OwnerPage />);
    expect(document.querySelector('[data-symbol="ADRO"]')).toHaveTextContent(
      "Reported as Edwin Soeryadjaja",
    );
    expect(document.querySelector('[data-symbol="MPMX"]')).not.toHaveTextContent("Reported as");
  });

  it("exposes provider labels, overlapping membership and check gaps", () => {
    useQuery.mockReturnValue([
      { slug: "salim", label: "Salim", symbols: ["TEST"], totalMarketCap: null },
    ]);
    const directory = render(<GroupsPage />);
    expect(screen.getByRole("link", { name: "Salim" })).toHaveAttribute("href", "/group/salim");
    directory.unmount();
    useParams.mockReturnValue({ slug: "salim" });
    useQuery.mockReturnValue({
      slug: "salim",
      label: "Salim",
      symbols: ["TEST"],
      totalMarketCap: null,
      members: [
        {
          symbol: "TEST",
          name: "Test Company",
          subSector: null,
          marketCap: null,
          freeFloat: 0.25,
          checks: [
            {
              checkId: "cash_conversion",
              value: null,
              percentile: null,
              peerCount: 4,
              gap: "Not reported: earnings[2025]",
            },
          ],
        },
      ],
    });
    render(<GroupPage />);
    expect(screen.getByText(/control has not been verified/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "TEST" })).toHaveAttribute("href", "/company/TEST");
    expect(screen.getByText("Earnings FY2025 not reported")).toBeInTheDocument();
    expect(screen.queryByText(/peers/)).not.toBeInTheDocument();
    expect(screen.getByText("25.00%")).toBeInTheDocument();
  });

  it("distinguishes loading, unknown keys and an empty search", () => {
    useParams.mockReturnValue({ key: "missing" });
    useQuery.mockReturnValue(undefined);
    const view = render(<OwnerPage />);
    view.rerender(<OwnerPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading owner");
    useQuery.mockReturnValue(null);
    view.rerender(<OwnerPage />);
    expect(screen.getByRole("heading", { name: "Owner not found" })).toBeInTheDocument();
    view.unmount();
    useQuery.mockReturnValue([]);
    render(<OwnersPage />);
    expect(screen.getByText("No owners match this search and view.")).toBeInTheDocument();
  });
  it("labels a custodian on its owner page and in the index", () => {
    const custodian = { ...owners[1], key: "bank of singapore", name: "Bank Of Singapore Limited" };
    useParams.mockReturnValue({ key: custodian.key });
    useQuery.mockReturnValue({ ...custodian, holdings: [], ownHolders: [] });
    const view = render(<OwnerPage />);
    expect(screen.getByText("Custodian or nominee account")).toBeInTheDocument();
    expect(screen.getByText(/may hold shares for clients/)).toBeInTheDocument();
    view.unmount();
    useQuery.mockReturnValue([custodian]);
    render(<OwnersPage />);
    expect(screen.getByText("Custodian or nominee account")).toBeInTheDocument();
  });
});
