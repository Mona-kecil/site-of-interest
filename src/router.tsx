import { Link, Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { CompanyProfilePage } from "./features/company/CompanyProfilePage";
import { UniversePage } from "./features/universe/UniversePage";
import { OwnersPage } from "./features/owners/OwnersPage";
import { OwnerPage } from "./features/owners/OwnerPage";
import { GroupsPage, GroupPage } from "./features/owners/GroupsPage";
import { IdeasPage } from "./features/ideas/IdeasPage";
import { LandingPage } from "./features/landing/LandingPage";
import manifest from "../data/universe/manifest.json";

const retrieved = new Date(manifest.retrievedAt);
const dateline = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(retrieved);
const footerDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).format(retrieved);

function Sections() {
  return (
    <>
      <Link to="/ideas">Ideas</Link>
      <Link to="/universe">Screener</Link>
      <Link to="/owners">Owners</Link>
      <Link to="/groups">Groups</Link>
    </>
  );
}

function RootLayout() {
  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="wrap">
          <Link className="wordmark" to="/">
            Site of Interest
          </Link>
          <nav aria-label="Product sections">
            <Sections />
          </nav>
          <span className="dateline">Sectors data · {dateline}</span>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <div className="wrap">
          <p>
            <b>Not investment advice.</b> Verdicts apply fixed rules to Sectors data retrieved on{" "}
            {footerDate} and inherit any errors in it.
          </p>
          <nav aria-label="Footer">
            <Sections />
          </nav>
        </div>
      </footer>
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const ideasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ideas",
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
  ideasRoute,
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
