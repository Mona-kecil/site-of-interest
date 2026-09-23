import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useMatchRoute,
  useRouterState,
} from "@tanstack/react-router";
import { EmpirePage } from "./features/empire/EmpirePage";
import { EmpireDirectoryPage } from "./features/empire/EmpireDirectoryPage";
import { CompanyPage, EmpireCompanyPage } from "./features/company/CompanyPage";
import { TodayPage } from "./features/today/TodayPage";
import { FocusPage } from "./features/focus/FocusPage";
import { FlowPage } from "./features/flow/FlowPage";

type FocusKind = "fundamental" | "broker" | "market" | "news";
type TodaySearch = { focusKind?: FocusKind; focusId?: string; focusEmpire?: string };
type EmpireSearch = { ticker?: string; originKind?: FocusKind; originId?: string };

function focusKind(value: unknown): FocusKind | undefined {
  return value === "fundamental" || value === "broker" || value === "market" || value === "news"
    ? value
    : undefined;
}

function RootLayout() {
  const matchRoute = useMatchRoute();
  const search = useRouterState({ select: (state) => state.location.search });
  const companyMatch = matchRoute({ to: "/company/$ticker" });
  const empireCompanyMatch = matchRoute({ to: "/empire/$empireSlug/company/$ticker" });
  const flowMatch = matchRoute({ to: "/flow/$ticker" });
  const empireMatch = matchRoute({ to: "/empire/$slug" });
  const selectedEmpireTicker =
    empireMatch && "ticker" in search && typeof search.ticker === "string"
      ? search.ticker
      : undefined;
  const flowTicker = flowMatch
    ? flowMatch.ticker
    : empireCompanyMatch
      ? empireCompanyMatch.ticker
      : companyMatch
        ? companyMatch.ticker
        : selectedEmpireTicker;
  const flowEmpireSlug =
    (empireCompanyMatch ? empireCompanyMatch.empireSlug : undefined) ??
    (empireMatch ? empireMatch.slug : undefined) ??
    ("empireSlug" in search && typeof search.empireSlug === "string"
      ? search.empireSlug
      : "prajogo");

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/happening">
          <span className="brand-mark" />
          Site of Interest
        </Link>
        <nav aria-label="Product sections">
          <Link
            activeProps={{ className: "nav-link is-active" }}
            className="nav-link"
            to="/happening"
          >
            What's happening?
          </Link>
          <Link
            activeProps={{ className: "nav-link is-active" }}
            className="nav-link"
            to="/empires"
          >
            Empires
          </Link>
          <span className="nav-link is-disabled">Asset map</span>
          {flowTicker ? (
            <Link
              activeProps={{ className: "nav-link is-active" }}
              className="nav-link"
              to="/flow/$ticker"
              params={{ ticker: flowTicker }}
              search={{ empireSlug: flowEmpireSlug }}
            >
              Flow
            </Link>
          ) : (
            <span className="nav-link is-disabled">Flow</span>
          )}
          <Link
            activeProps={{ className: "nav-link is-active" }}
            className="nav-link"
            to="/focus/$empireSlug"
            params={{ empireSlug: "prajogo" }}
          >
            Focus
          </Link>
        </nav>
        <span className="product-state">Research build 01</span>
      </header>
      <Outlet />
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/happening" });
  },
});

const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/happening",
  validateSearch: (search): TodaySearch => ({
    focusKind: focusKind(search.focusKind),
    focusId: typeof search.focusId === "string" ? search.focusId : undefined,
    focusEmpire: typeof search.focusEmpire === "string" ? search.focusEmpire : undefined,
  }),
  component: TodayPage,
});

const legacyTodayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/today",
  beforeLoad: () => {
    throw redirect({ to: "/happening" });
  },
});

const empireRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/empire/$slug",
  validateSearch: (search): EmpireSearch => ({
    ticker: typeof search.ticker === "string" ? search.ticker : undefined,
    originKind: focusKind(search.originKind),
    originId: typeof search.originId === "string" ? search.originId : undefined,
  }),
  component: EmpirePage,
});

const empireDirectoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/empires",
  component: EmpireDirectoryPage,
});

const companyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/company/$ticker",
  component: CompanyPage,
});

const empireCompanyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/empire/$empireSlug/company/$ticker",
  component: EmpireCompanyPage,
});

const focusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/focus/$empireSlug",
  component: FocusPage,
});

const flowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/flow/$ticker",
  validateSearch: (search): { empireSlug: string } => ({
    empireSlug:
      typeof search.empireSlug === "string" && search.empireSlug.length > 0
        ? search.empireSlug
        : "prajogo",
  }),
  component: FlowPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  todayRoute,
  legacyTodayRoute,
  empireDirectoryRoute,
  empireRoute,
  companyRoute,
  empireCompanyRoute,
  focusRoute,
  flowRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
