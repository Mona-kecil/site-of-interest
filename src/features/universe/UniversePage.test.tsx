import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { definitions } from "../../universe/checks.mjs";
import { UniversePage } from "./UniversePage";
import type { ScreenRow } from "./universe-model";
import { IdeasPage } from "../ideas/IdeasPage";

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("convex/react", () => ({ useQuery }));
vi.mock("@tanstack/react-router", () => ({
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

const companies: ScreenRow[] = [
  {
    symbol: "BANK",
    name: "Test Bank",
    sector: "Financials",
    subSector: "Banks",
    indices: ["LQ45"],
    marketCap: 100,
    freeFloat: 0.4,
    peTtm: 12,
    checks: [{ checkId: "npl_ratio", value: 0.02, percentile: 0.5, peerCount: 48, gap: null }],
  },
  {
    symbol: "CASH",
    name: "Cash Company",
    sector: "Industrials",
    subSector: "Industrial Goods",
    indices: null,
    marketCap: 200,
    freeFloat: null,
    peTtm: null,
    checks: [
      {
        checkId: "cash_conversion",
        value: null,
        percentile: null,
        peerCount: 8,
        gap: "Not reported: operating_cash_flow[2024]",
      },
    ],
  },
];
const detail: NonNullable<FunctionReturnType<typeof api.universe.check>> = {
  symbol: "BANK",
  checkId: "npl_ratio",
  subSector: "Banks",
  period: "FY2025",
  value: 0.02,
  percentile: 0.5,
  peerCount: 48,
  gap: null,
  definition: definitions.find(({ id }) => id === "npl_ratio")!,
  inputs: [
    {
      key: "nonPerformingLoan",
      field: "non_performing_loan[2025]",
      period: "2025",
      value: 2,
      sourceId: "page",
      source: {
        id: "universe-01-0",
        title: "Bank source page",
        endpoint: "/v2/companies/?offset=0",
        retrievedAt: "2026-10-02T09:56:37.757Z",
      },
    },
  ],
};

afterEach(() => {
  cleanup();
  useQuery.mockReset();
});

describe("Universe page", () => {
  it("filters a bank, switches lenses, sorts and opens its sourced formula", () => {
    useQuery.mockImplementation((_query: unknown, args: { checkId?: string }) =>
      args.checkId ? detail : companies,
    );
    render(<UniversePage />);
    expect(screen.getByRole("status")).toHaveTextContent("2 of 2 companies");
    fireEvent.click(screen.getByRole("button", { name: "Symbol ↑" }));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("CASH");
    fireEvent.change(screen.getByLabelText("Sub-sector"), { target: { value: "Banks" } });
    fireEvent.click(screen.getByRole("tab", { name: "Banks" }));
    expect(screen.getByRole("status")).toHaveTextContent("1 of 2 companies");
    const cell = screen.getByRole("button", { name: "BANK NPL ratio" });
    expect(cell).toHaveTextContent("2.00%");
    expect(cell).toHaveTextContent("p50 · 48 peers");
    cell.focus();
    fireEvent.click(cell);
    const panel = screen.getByRole("complementary", { name: "Check details" });
    expect(panel).toHaveFocus();
    expect(within(panel).getByText("What share of loans is non-performing?")).toBeInTheDocument();
    expect(
      within(panel).getByText("non_performing_loan[2025] / gross_loan[2025]"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("non_performing_loan[2025]")).toBeInTheDocument();
    expect(within(panel).getByText("Non-performing loans · FY2025")).toBeInTheDocument();
    expect(
      within(panel).getByText("Sectors · /v2/companies/ · batch 1 of 10 · rows 1–200 · 2 Oct 2026"),
    ).toBeInTheDocument();
    fireEvent.click(within(panel).getByText("Full endpoint"));
    expect(within(panel).getByText("/v2/companies/?offset=0")).toBeInTheDocument();
    expect(within(panel).getByText("2026-10-02T09:56:37.757Z")).toBeInTheDocument();
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(cell).toHaveFocus();
  });

  it("keeps a gap reason on the focusable cell and navigates lens tabs with the keyboard", () => {
    useQuery.mockReturnValue(companies);
    render(<UniversePage />);
    const cell = screen.getByRole("button", { name: "CASH Cash conversion" });
    expect(cell).toHaveTextContent("Not reported");
    expect(cell).toHaveAccessibleDescription("Operating cash flow FY2024 not reported");
    expect(cell).not.toHaveTextContent(/peers/);
    expect(screen.getAllByText("Does not apply")[0].tagName).toBe("SPAN");
    const cash = screen.getByRole("tab", { name: "Cash" });
    fireEvent.keyDown(cash, { key: "ArrowRight" });
    const returns = screen.getByRole("tab", { name: "Returns" });
    expect(returns).toHaveAttribute("aria-selected", "true");
    expect(returns).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Search companies"), { target: { value: "unlisted" } });
    expect(screen.getByText("No companies match these filters.")).toBeInTheDocument();
  });
});

describe("Ideas page", () => {
  it("limits each list to 12, expands it, and retains evidence and the market cap cutoff", () => {
    const checks = Object.entries({
      cash_conversion: 1,
      roic: 0.15,
      net_debt_to_ebitda: 1,
      pe_vs_history: 0.8,
      free_float: 0.3,
    }).map(([checkId, value]) => ({ checkId, value, percentile: null, peerCount: 1, gap: null }));
    const rows: ScreenRow[] = Array.from({ length: 14 }, (_, index) => ({
      ...companies[1],
      symbol: `IDEA${index}`,
      marketCap: (index + 1) * 1e12,
      peTtm: 12,
      checks,
    }));
    rows.push({ ...rows[0], symbol: "SMALL", marketCap: 1e12 - 1 });
    rows.push({ ...rows[0], symbol: "FLAG", marketCap: 2e12, peTtm: 100 });
    useQuery.mockReturnValue(rows);
    render(<IdeasPage />);
    const ideas = screen.getByRole("region", { name: "Worth a look · 14" });
    expect(within(ideas).getAllByRole("article")).toHaveLength(12);
    expect(within(ideas).getAllByRole("article")[0]).toHaveTextContent("IDEA13");
    expect(within(ideas).getAllByRole("article")[0]).toHaveTextContent(
      "Cash conversion: 1.00×; meets pass >= 0.80×",
    );
    expect(screen.queryByRole("link", { name: "SMALL", exact: true })).not.toBeInTheDocument();
    fireEvent.click(
      within(ideas).getByRole("button", { name: "Show all 14 worth a look companies" }),
    );
    expect(within(ideas).getAllByRole("article")).toHaveLength(14);
    const flags = screen.getByRole("region", { name: "Red flags · 1" });
    expect(flags).toHaveTextContent("Priced for perfection");
    expect(flags).toHaveTextContent("Current P/E: 100.00×; flags > 50.00×");
    expect(within(flags).getByRole("link", { name: "FLAG", exact: true })).toHaveAttribute(
      "href",
      "/company/FLAG",
    );
  });
});
