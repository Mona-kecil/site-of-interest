import { checkCell, formatValue } from "../../universe/presentation.mjs";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { definitions } from "../../universe/checks.mjs";
import { formatMarketCap } from "../universe/universe-model";

const groupNote =
  "Sectors business-group labels. Membership follows the provider's affiliates field; control has not been verified. A company can carry more than one label.";

export function GroupsPage() {
  const groups = useQuery(api.owners.groups, {});
  return (
    <main className="owners-page">
      <header className="owners-header">
        <p className="eyebrow">IDX / Sectors labels</p>
        <h1>Groups</h1>
        <p>{groupNote}</p>
      </header>
      {groups === undefined ? (
        <p role="status">Loading groups</p>
      ) : (
        <div className="owners-table-wrap" role="region" aria-label="Business groups" tabIndex={0}>
          <table className="owners-table owners-groups">
            <caption>{groups.length} Sectors business-group labels</caption>
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">Members</th>
                <th scope="col">Combined market cap</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.slug}>
                  <th scope="row">
                    <Link to="/group/$slug" params={{ slug: group.slug }}>
                      {group.label}
                    </Link>
                  </th>
                  <td>{group.symbols.length}</td>
                  <td>{formatMarketCap(group.totalMarketCap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {groups.length === 0 && (
            <p className="owners-empty">No business-group labels in the stored snapshot.</p>
          )}
        </div>
      )}
      <p className="owners-note">
        Combined market cap sums reported company values. Not reported means none were reported.
        Values can overlap across labels and include both a parent and its listed subsidiaries.
      </p>
    </main>
  );
}

export function GroupPage() {
  const { slug } = useParams({ from: "/group/$slug" });
  const group = useQuery(api.owners.group, { slug });
  return (
    <main className="owners-page">
      <Link className="owners-back" to="/groups">
        ← Groups
      </Link>
      {group === undefined ? (
        <p role="status">Loading group</p>
      ) : group === null ? (
        <>
          <h1>Group not found</h1>
          <p>No group has this label in the stored snapshot.</p>
        </>
      ) : (
        <>
          <header className="owners-header">
            <p className="eyebrow">IDX / Sectors business-group label</p>
            <h1>{group.label}</h1>
            <p>{groupNote}</p>
            <p>
              {group.members.length} members · {formatMarketCap(group.totalMarketCap)} combined
              reported market cap
            </p>
          </header>
          <p className="owners-note">
            Checks show measurements and sub-sector percentiles, without a direction. Gap categories
            name missing inputs, undefined bases or short histories. Does not apply marks excluded
            checks. Market caps sum reported values, including listed parents and subsidiaries.
          </p>
          <div
            className="owners-table-wrap"
            role="region"
            aria-label="Group members and checks"
            tabIndex={0}
          >
            <table className="owners-table owners-members">
              <caption>
                {group.members.length} members · Sectors business-group label: {group.label}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Sub-sector</th>
                  <th scope="col">Market cap</th>
                  <th scope="col">Free float</th>
                  {definitions.map((definition) => (
                    <th key={definition.id} scope="col">
                      {definition.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.members.map((company) => (
                  <tr key={company.symbol} data-symbol={company.symbol}>
                    <th scope="row">
                      <Link to="/company/$ticker" params={{ ticker: company.symbol }}>
                        {company.symbol}
                      </Link>
                      <small>{company.name}</small>
                    </th>
                    <td>{company.subSector ?? "Not reported"}</td>
                    <td>{formatMarketCap(company.marketCap)}</td>
                    <td>{formatValue(company.freeFloat, "percent")}</td>
                    {definitions.map((definition) => {
                      const check = company.checks.find(({ checkId }) => checkId === definition.id);
                      const cell = checkCell(check, definition.unit);
                      return (
                        <td key={definition.id} title={cell.reason ?? undefined}>
                          <span
                            className={
                              cell.state === "does-not-apply" ? "check-does-not-apply" : undefined
                            }
                          >
                            {cell.text}
                          </span>
                          {cell.peers && <small>{cell.peers}</small>}
                          {cell.reason && <small className="owners-check-gap">{cell.reason}</small>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
