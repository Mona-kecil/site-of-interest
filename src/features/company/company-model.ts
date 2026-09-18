export interface ValuationPoint {
  year: number;
  pe: number | null;
  peerPe: number | null;
}

export interface FinancialPoint {
  year: number;
  earnings: number;
  freeCashFlow: number;
}

export interface SignalPoint {
  metric: string;
  value: number;
}

export interface CycleLens {
  title: string;
  summary: string;
  status: "insufficient" | "priced_ahead" | "premium_delivery" | "delivery" | "steady";
  latestPe: number | null;
  peerPe: number | null;
  peerPremium: number | null;
  earningsGrowth: number | null;
}

export function deriveCycleLens(
  valuations: ReadonlyArray<ValuationPoint>,
  financials: ReadonlyArray<FinancialPoint>,
  signals: ReadonlyArray<SignalPoint>,
): CycleLens {
  const latestValuation = valuations.at(-1);
  const latestFinancial = financials.at(-1);
  const earningsGrowthSignal = signals.find(
    (signal) => signal.metric === "yoy_quarter_earnings_growth",
  );
  const earningsGrowth = earningsGrowthSignal?.value ?? null;

  if (latestValuation === undefined) {
    return {
      title: "Insufficient valuation history",
      summary: "Sectors has not returned a current valuation point for this company.",
      status: "insufficient",
      latestPe: null,
      peerPe: null,
      peerPremium: null,
      earningsGrowth,
    };
  }

  const peerPremium =
    latestValuation.pe !== null && latestValuation.peerPe !== null && latestValuation.peerPe > 0
      ? latestValuation.pe / latestValuation.peerPe - 1
      : null;

  if (
    latestFinancial !== undefined &&
    latestFinancial.earnings <= 0 &&
    latestValuation.pe !== null &&
    latestValuation.pe > 0
  ) {
    return {
      title: "Recovery priced ahead",
      summary:
        "The market assigns a positive multiple while the latest annual earnings remain negative. Quarterly delivery matters more than the headline P/E here.",
      status: "priced_ahead",
      latestPe: latestValuation.pe,
      peerPe: latestValuation.peerPe,
      peerPremium,
      earningsGrowth,
    };
  }

  if (peerPremium !== null && peerPremium > 1 && earningsGrowth !== null && earningsGrowth > 20) {
    return {
      title: "Premium under delivery test",
      summary:
        "Earnings are growing, but the company still trades at more than twice the Sectors peer P/E. Delivery must keep closing that gap.",
      status: "premium_delivery",
      latestPe: latestValuation.pe,
      peerPe: latestValuation.peerPe,
      peerPremium,
      earningsGrowth,
    };
  }

  if (earningsGrowth !== null && earningsGrowth > 20) {
    return {
      title: "Earnings delivery",
      summary:
        "Quarterly earnings growth is positive; watch whether cash flow and valuation follow.",
      status: "delivery",
      latestPe: latestValuation.pe,
      peerPe: latestValuation.peerPe,
      peerPremium,
      earningsGrowth,
    };
  }

  return {
    title: "Steady-state watch",
    summary: "The latest Sectors data does not show a decisive valuation-cycle transition.",
    status: "steady",
    latestPe: latestValuation.pe,
    peerPe: latestValuation.peerPe,
    peerPremium,
    earningsGrowth,
  };
}

export function formatCompanyValue(value: number, unit: string): string {
  const compact = (amount: number) => Number(amount.toFixed(2)).toString();
  if (unit === "IDR") {
    const sign = value < 0 ? "−" : "";
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000_000_000) return `${sign}Rp${compact(absolute / 1_000_000_000_000)}tn`;
    if (absolute >= 1_000_000_000) return `${sign}Rp${compact(absolute / 1_000_000_000)}bn`;
    if (absolute >= 1_000_000) return `${sign}Rp${compact(absolute / 1_000_000)}m`;
    return `${sign}Rp${absolute.toLocaleString("en-US")}`;
  }
  if (unit === "IDR_per_share") return `Rp${value.toLocaleString("en-US")}`;
  if (unit === "percent") return `${compact(value)}%`;
  if (unit === "multiple") return `${compact(value)}×`;
  return value.toLocaleString("en-US");
}
