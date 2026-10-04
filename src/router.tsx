import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { CompanyProfilePage } from "./features/company/CompanyProfilePage";
import { UniversePage } from "./features/universe/UniversePage";
import { OwnersPage } from "./features/owners/OwnersPage";
import { OwnerPage } from "./features/owners/OwnerPage";
import { GroupsPage, GroupPage } from "./features/owners/GroupsPage";

function RootLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/universe">
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
  beforeLoad: () => {
    throw redirect({ to: "/universe" });
  },
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

const universeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/universe",
  component: UniversePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  companyRoute,
  empireCompanyRoute,
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
