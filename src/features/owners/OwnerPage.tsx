import { isCustodianName } from "../../universe/owners.mjs";
import { CustodianLabel } from "./CustodianLabel";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatMarketCap, formatValue } from "../universe/universe-model";
import { kindLabels } from "./owners-model";
import { OwnershipGraph } from "./OwnershipGraph";

export function OwnerPage() {
  const { key } = useParams({ from: "/owner/$key" });
  const owner = useQuery(api.owners.get, { key });
  return (
    <main className="owners-page">
      <Link className="owners-back" to="/owners">
        ← Owners
      </Link>
      {owner === undefined ? (
        <p role="status">Loading owner</p>
      ) : owner === null ? (
        <>
          <h1>Owner not found</h1>
          <p>No owner has this key in the stored snapshot.</p>
        </>
      ) : (
        <>
          <header className="owners-header">
            <p className="eyebrow">IDX / {kindLabels[owner.kind]}</p>
            <h1>{owner.name}</h1>
            {isCustodianName(owner.name) && <CustodianLabel />}
            {owner.listedSymbol && (
              <Link to="/company/$ticker" params={{ ticker: owner.listedSymbol }}>
                {owner.listedSymbol} company page →
              </Link>
            )}
            <p>
              {owner.companyCount} companies held · {formatMarketCap(owner.totalValue)} in reported
              stake values
            </p>
            {owner.kind === "bucket" && (
              <p>
                This label combines unnamed holders. Stakes across companies do not identify one
                controlling owner.
              </p>
            )}
          </header>
          <OwnershipGraph owner={owner} />
          <h2 id="owner-holdings">Holdings</h2>
          <p className="owners-note">
            Percentages are reported stakes. Rank compares entity rows within each company; ties
            share a rank. Public and treasury rows are excluded. Not reported marks a missing value.
            Multiple source rows stay separate.
          </p>
          <div className="owners-table-wrap" role="region" aria-label="Owner holdings" tabIndex={0}>
            <table className="owners-table owners-holdings">
              <caption>{owner.holdings.length} reported holdings</caption>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Stake %</th>
                  <th scope="col">Rank</th>
                  <th scope="col">Stake value</th>
                  <th scope="col">Sub-sector</th>
                  <th scope="col">Other entity holders</th>
                </tr>
              </thead>
              <tbody>
                {owner.holdings.map((holding, index) => (
                  <tr key={`${holding.symbol}:${index}`} data-symbol={holding.symbol}>
                    <th scope="row">
                      <Link to="/company/$ticker" params={{ ticker: holding.symbol }}>
                        {holding.symbol}
                      </Link>
                      <small>{holding.name ?? "Name not reported"}</small>
                      {holding.reportedName !== owner.name && (
                        <small>Reported as {holding.reportedName}</small>
                      )}
                      <small>Market cap: {formatMarketCap(holding.marketCap)}</small>
                    </th>
                    <td>{formatValue(holding.percentage, "percent")}</td>
                    <td>
                      {holding.rank ?? "Not reported"}
                      {holding.isLargest && <small>Largest entity stake</small>}
                    </td>
                    <td>
                      {formatMarketCap(holding.value)}
                      <small>Source: {holding.sourceId}</small>
                    </td>
                    <td>{holding.subSector ?? "Not reported"}</td>
                    <td>
                      {holding.coHolders.length ? (
                        <details>
                          <summary>{holding.coHolders.length} other entity holders</summary>
                          <ul>
                            {holding.coHolders.map((holder, holderIndex) => (
                              <li key={`${holder.key}:${holderIndex}`}>
                                <Link to="/owner/$key" params={{ key: holder.key }}>
                                  {holder.name}
                                </Link>
                                <span>
                                  {formatValue(holder.percentage, "percent")} · rank{" "}
                                  {holder.rank ?? "Not reported"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        "None reported"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {owner.listedSymbol && (
            <section id="owner-upstream" className="owners-upstream">
              <h2>Holders of {owner.listedSymbol}</h2>
              <p className="owners-note">
                One level above this listed owner, from its reported entity holdings.
              </p>
              {owner.ownHolders.length ? (
                <div
                  className="owners-table-wrap"
                  role="region"
                  aria-label="Upstream holders"
                  tabIndex={0}
                >
                  <table className="owners-table">
                    <caption>{owner.ownHolders.length} reported upstream holdings</caption>
                    <thead>
                      <tr>
                        <th scope="col">Holder</th>
                        <th scope="col">Stake %</th>
                        <th scope="col">Rank</th>
                        <th scope="col">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {owner.ownHolders.map((holder, index) => (
                        <tr key={`${holder.key}:${index}`}>
                          <th scope="row">
                            <Link to="/owner/$key" params={{ key: holder.key }}>
                              {holder.name}
                            </Link>
                          </th>
                          <td>{formatValue(holder.percentage, "percent")}</td>
                          <td>{holder.rank ?? "Not reported"}</td>
                          <td>{holder.sourceId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No entity holders reported.</p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
