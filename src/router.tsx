import { Link, Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { CompanyProfilePage } from "./features/company/CompanyProfilePage";
import { UniversePage } from "./features/universe/UniversePage";
import { OwnersPage } from "./features/owners/OwnersPage";
import { OwnerPage } from "./features/owners/OwnerPage";
import { GroupsPage, GroupPage } from "./features/owners/GroupsPage";
import { IdeasPage } from "./features/ideas/IdeasPage";

function RootLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark" />
          Site of Interest
        </Link>
        <nav aria-label="Product sections">
          <Link
            activeProps={{ className: "nav-link is-active" }}
            activeOptions={{ exact: true }}
            className="nav-link"
            to="/"
          >
            Ideas
          </Link>
          <Link
            activeProps={{ className: "nav-link is-active" }}
            className="nav-link"
            to="/universe"
          >
            Screener
          </Link>
          <Link activeProps={{ className: "nav-link is-active" }} className="nav-link" to="/owners">
            Owners
          </Link>
          <Link activeProps={{ className: "nav-link is-active" }} className="nav-link" to="/groups">
            Groups
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
  component: IdeasPage,
});

const companyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/company/$ticker",
  component: CompanyProfilePage,
});

const universeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/universe",
  component: UniversePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  companyRoute,
  universeRoute,
  createRoute({ getParentRoute: () => rootRoute, path: "/owners", component: OwnersPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/owner/$key", component: OwnerPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/groups", component: GroupsPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/group/$slug", component: GroupPage }),
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
