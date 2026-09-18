import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { EmpirePage } from "./features/empire/EmpirePage";
import { CompanyPage } from "./features/company/CompanyPage";

function RootLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/empire/$slug" params={{ slug: "prajogo" }}>
          <span className="brand-mark" />
          Site of Interest
        </Link>
        <nav aria-label="Product sections">
          <Link
            activeProps={{ className: "nav-link is-active" }}
            className="nav-link"
            to="/empire/$slug"
            params={{ slug: "prajogo" }}
          >
            Empire
          </Link>
          <span className="nav-link is-disabled">Asset map</span>
          <span className="nav-link is-disabled">Flow</span>
          <span className="nav-link is-disabled">Focus</span>
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
    throw redirect({ to: "/empire/$slug", params: { slug: "prajogo" } });
  },
});

const empireRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/empire/$slug",
  component: EmpirePage,
});

const companyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/company/$ticker",
  component: CompanyPage,
});

const routeTree = rootRoute.addChildren([indexRoute, empireRoute, companyRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
