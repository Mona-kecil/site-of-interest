import { isCustodianName } from "../../universe/owners.mjs";
import { CustodianLabel } from "./CustodianLabel";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatMarketCap } from "../universe/universe-model";
import { defaultSort, kindLabels, ownerRows, type OwnerSort } from "./owners-model";

const columns: { id: OwnerSort["column"]; label: string }[] = [
  { id: "name", label: "Name" },
  { id: "kind", label: "Type" },
  { id: "companyCount", label: "Companies held" },
  { id: "totalValue", label: "Total stake value" },
  { id: "largestHolderCount", label: "Largest shareholder in" },
];

export function OwnersPage() {
  const owners = useQuery(api.owners.list, {});
  const [search, setSearch] = useState("");
  const [listedOnly, setListedOnly] = useState(false);
  const [sort, setSort] = useState<OwnerSort>(defaultSort);
  const rows = ownerRows(owners ?? [], search, listedOnly, sort);
  return (
    <main className="page owners-page wrap">
      <header className="page-head">
        <h1>Owners</h1>
        <div className="page-intro">
          <p>Who holds each company, and what else they hold.</p>
        </div>
      </header>
      <div className="owners-views" role="tablist" aria-label="Owner views">
        <button
          type="button"
          role="tab"
          aria-selected={!listedOnly}
          onClick={() => setListedOnly(false)}
        >
          All owners
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listedOnly}
          onClick={() => setListedOnly(true)}
        >
          Listed companies that own others
        </button>
      </div>
      <div className="owners-controls">
        <label>
          Search owners
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or listed symbol"
          />
        </label>
      </div>
      <p className="owners-note">
        Public shares and shares a company holds in itself are left out. “Largest shareholder in”
        counts the companies where this owner has the biggest named stake, which doesn’t always mean
        control.
      </p>
      {owners === undefined ? (
        <p className="page-loading" role="status">
          Loading owners
        </p>
      ) : (
        <div className="owners-table-wrap" role="region" aria-label="Owner index" tabIndex={0}>
          <table className="owners-table">
            <caption>
              {rows.length.toLocaleString("en")} of {owners.length.toLocaleString("en")} owners
            </caption>
            <thead>
              <tr>
                {columns.map(({ id, label }) => (
                  <th
                    key={id}
                    scope="col"
                    aria-sort={
                      sort.column === id
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSort({
                          column: id,
                          direction:
                            sort.column === id && sort.direction === "desc" ? "asc" : "desc",
                        })
                      }
                    >
                      {label}
                      {sort.column === id ? (sort.direction === "desc" ? " ↓" : " ↑") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((owner) => (
                <tr
                  key={owner.key}
                  data-owner-key={owner.key}
                  data-company-count={owner.companyCount}
                >
                  <th scope="row">
                    <Link to="/owner/$key" params={{ key: owner.key }}>
                      {owner.name}
                    </Link>
                    {isCustodianName(owner.name) && <CustodianLabel />}
                    {owner.listedSymbol && (
                      <small>
                        <Link to="/company/$ticker" params={{ ticker: owner.listedSymbol }}>
                          {owner.listedSymbol}
                        </Link>
                      </small>
                    )}
                  </th>
                  <td>{kindLabels[owner.kind]}</td>
                  <td>{owner.companyCount}</td>
                  <td>{formatMarketCap(owner.totalValue)}</td>
                  <td>{owner.largestHolderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="owners-empty">No owners match this search and view.</p>
          )}
        </div>
      )}
    </main>
  );
}
