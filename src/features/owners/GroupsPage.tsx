import { checkCell, formatValue } from "../../universe/presentation.mjs";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { definitions } from "../../universe/checks.mjs";
import { formatMarketCap } from "../universe/universe-model";
import { groupNetwork } from "./network";
import { NetworkGraph } from "./NetworkGraph";

const groupNote =
  "Business groups as our data provider labels them. Being in a group doesn’t prove who controls a company, and a company can sit in more than one group.";

export function GroupsPage() {
  const groups = useQuery(api.owners.groups, {});
  return (
    <main className="page owners-page wrap">
      <header className="page-head">
        <h1>Groups</h1>
        <div className="page-intro">
          <p>{groupNote}</p>
        </div>
      </header>
      {groups === undefined ? (
        <p className="page-loading" role="status">
          Loading groups
        </p>
      ) : (
        <div className="owners-table-wrap" role="region" aria-label="Business groups" tabIndex={0}>
          <table className="owners-table owners-groups">
            <caption>{groups.length} business groups</caption>
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">Companies</th>
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
          {groups.length === 0 && <p className="owners-empty">No business groups.</p>}
        </div>
      )}
      <p className="owners-note">
        Combined market cap adds up each company’s value, so a parent and its listed subsidiaries
        both count, and a company in two groups counts in both.
      </p>
    </main>
  );
}

export function GroupPage() {
  const { slug } = useParams({ from: "/group/$slug" });
  const group = useQuery(api.owners.group, { slug });
  return (
    <main className="page owners-page wrap">
      <Link className="back" to="/groups">
        ← Groups
      </Link>
      {group === undefined ? (
        <p className="page-loading" role="status">
          Loading group
        </p>
      ) : group === null ? (
        <>
          <h1>Group not found</h1>
          <p>We have no business group by this name.</p>
        </>
      ) : (
        <>
          <header className="page-head">
            <h1>{group.label}</h1>
            <div className="page-intro">
              <p>
                {group.members.length} companies · {formatMarketCap(group.totalMarketCap)} combined
                market cap
              </p>
              <p>{groupNote}</p>
            </div>
          </header>
          <NetworkGraph
            network={groupNetwork(group)}
            label={`Companies in the ${group.label} group`}
          >
            Each company in the group with up to two of its largest shareholders. A dashed blue line
            links a shareholder to another company it owns in the group. Bigger dots mean bigger
            stakes.
          </NetworkGraph>
          <div
            className="owners-table-wrap"
            role="region"
            aria-label="Group members and checks"
            tabIndex={0}
          >
            <table className="owners-table owners-members">
              <caption>
                {group.members.length} companies in the {group.label} group
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
                    <td>{company.subSector ?? "No data"}</td>
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
