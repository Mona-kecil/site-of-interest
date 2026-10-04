import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { EmpirePage } from "./features/empire/EmpirePage";
import { EmpireDirectoryPage } from "./features/empire/EmpireDirectoryPage";
import { CompanyProfilePage } from "./features/company/CompanyProfilePage";
import { TodayPage } from "./features/today/TodayPage";
import { FocusPage } from "./features/focus/FocusPage";
import { UniversePage } from "./features/universe/UniversePage";

type FocusKind = "fundamental" | "news";
type TodaySearch = { focusKind?: FocusKind; focusId?: string; focusEmpire?: string };
type EmpireSearch = { ticker?: string; originKind?: FocusKind; originId?: string };

function focusKind(value: unknown): FocusKind | undefined {
  return value === "fundamental" || value === "news" ? value : undefined;
}

function RootLayout() {
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
            to="/universe"
          >
            Universe
          </Link>
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
  component: CompanyProfilePage,
});

const empireCompanyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/empire/$empireSlug/company/$ticker",
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/company/$ticker", params: { ticker: params.ticker } });
  },
});

const focusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/focus/$empireSlug",
  component: FocusPage,
});

const universeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/universe",
  component: UniversePage,
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
  universeRoute,
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
