import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { definitions } from "../../universe/checks.mjs";
import { UniversePage } from "./UniversePage";
import type { ScreenRow } from "./universe-model";

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
