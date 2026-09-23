import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const evidenceLabels = {
  provider_affiliate: "Affiliate",
  provider_group_label: "Group label",
  ownership_path: "Ownership path",
} as const;

export function EmpireDirectoryPage() {
  const empires = useQuery(api.empireDirectory.list, {});

  if (empires === undefined) {
    return (
      <main className="route-state">
        <span className="loading-orbit" />
        <p>Loading the ticker universe</p>
      </main>
    );
  }

  return (
    <main className="empire-directory">
      <header className="directory-header">
        <div>
          <p className="eyebrow">Research universe</p>
          <h1>Conglomerate companies</h1>
        </div>
        <p>
          Sectors affiliate classifications start each universe. Company reports and ownership paths
          extend it. These records describe evidence, not a legal conclusion.
        </p>
      </header>

      {empires.length === 0 ? (
        <section className="directory-empty">
          <h2>No Empire corpus is imported.</h2>
          <p>Run the local seed after starting Convex.</p>
        </section>
      ) : (
        <div className="directory-grid">
          {empires.map((empire) => (
            <section className="directory-card" key={empire.slug}>
              <header>
                <div>
                  <p className="eyebrow">As of {empire.asOf}</p>
                  <h2>{empire.name}</h2>
                </div>
                <Link
                  to="/empire/$slug"
                  params={{ slug: empire.slug }}
                  search={{ ticker: undefined, originKind: undefined, originId: undefined }}
                >
                  Open Empire
                </Link>
              </header>

              <div className="directory-summary">
                <span>{empire.memberships.length} listed companies</span>
                <span>{empire.status}</span>
              </div>

              <ul className="directory-memberships">
                {empire.memberships.map((membership) => (
                  <li key={membership.ticker}>
                    <Link
                      to="/empire/$empireSlug/company/$ticker"
                      params={{ empireSlug: empire.slug, ticker: membership.ticker }}
                    >
                      <strong>{membership.ticker}</strong>
                      <span>{membership.companyName}</span>
                    </Link>
                    <div aria-label={`Evidence for ${membership.ticker}`}>
                      {[...new Set(membership.evidence.map(({ kind }) => kind))].map((kind) => (
                        <span className={`evidence-kind evidence-${kind}`} key={kind}>
                          {evidenceLabels[kind]}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              {empire.membershipLimitReached ? (
                <p className="directory-limit">This view reached its 250-company limit.</p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
