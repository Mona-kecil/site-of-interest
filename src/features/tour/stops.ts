export type TourStop = {
  /** The `data-tour` value of the element this stop rings. */
  target: string;
  /** The page the tour opens when the visitor is somewhere else. */
  path: string;
  /** Pages where this stop can ring its target. */
  shows: (pathname: string) => boolean;
  place: string;
  title: string;
  body: string;
};

const under = (prefix: string) => (pathname: string) => pathname.startsWith(prefix);

export const STOPS: readonly TourStop[] = [
  {
    target: "ratings",
    path: "/",
    shows: (pathname) => pathname === "/",
    place: "The ratings",
    title: "Five questions for every company",
    body: "Each column asks one question: cash, returns, balance sheet, price and owners. A solid dot passes and a red cross is a flag. Point at or tap a mark to see its number, or search for any company to add it to the chart.",
  },
  {
    target: "ideas",
    path: "/ideas",
    shows: under("/ideas"),
    place: "Ideas",
    title: "The shortlist",
    body: "Worth a look lists companies worth at least IDR 1T that clear every flag line and pass the core checks, with the numbers behind each one. Red flags, further down, shows which line each company crossed.",
  },
  {
    target: "verdict",
    path: "/company/TLKM",
    shows: under("/company/"),
    place: "A company",
    title: "Every verdict shows its work",
    body: "Each pillar lists its measurements and the line each was judged against. Open the details to see how the company ranks against its peers and the yearly figures behind every number.",
  },
  {
    target: "track-record",
    path: "/company/TLKM",
    shows: under("/company/"),
    place: "Its track record",
    title: "The same rules, year by year",
    body: "Each annual report since FY2021 is held to today’s lines, so you can tell a pass that has held for years from a new one. Analyst estimates for FY2026 sit beside it when Sectors has them, and play no part in the rating.",
  },
  {
    target: "screener",
    path: "/universe",
    shows: under("/universe"),
    place: "The screener",
    title: "All 962 companies, every number",
    body: "Pick a lens, filter by sector or verdict, and sort any column. Click a number to see how it’s calculated, the figures that went into it and where they came from.",
  },
  {
    target: "network",
    path: "/owner/dwimuria%20investama%20andalan",
    shows: (pathname) => pathname.startsWith("/owner/") || pathname.startsWith("/group/"),
    place: "Who owns what",
    title: "Follow the owners",
    body: "Shareholders of record, drawn as a network. Bigger dots mean bigger stakes. Click a company or a holder to follow the chain to everything else it owns.",
  },
];

/** The stop for the page the visitor is on, or the first stop. */
export function firstStop(pathname: string) {
  return Math.max(
    0,
    STOPS.findIndex((stop) => stop.shows(pathname)),
  );
}
