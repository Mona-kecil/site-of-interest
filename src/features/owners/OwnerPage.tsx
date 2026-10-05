import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import manifest from "../../../data/universe/manifest.json";
import { isCustodianName } from "../../universe/owners.mjs";
import { formatValue, sourceLine } from "../../universe/presentation.mjs";
import { formatMarketCap } from "../universe/universe-model";
import { CustodianLabel } from "./CustodianLabel";
import { ownerNetwork } from "./network";
import { NetworkGraph } from "./NetworkGraph";
import { kindLabels } from "./owners-model";

const companies = (count: number) => `${count} ${count === 1 ? "company" : "companies"}`;

export function OwnerPage() {
  const { key } = useParams({ from: "/owner/$key" });
  const owner = useQuery(api.owners.get, { key });
  return (
    <main className="page owners-page wrap">
      <Link className="back" to="/owners">
        ← Owners
      </Link>
      {owner === undefined ? (
        <p className="page-loading" role="status">
          Loading owner
        </p>
      ) : owner === null ? (
        <>
          <h1>Owner not found</h1>
          <p>We have no shareholder by this name.</p>
        </>
      ) : (
        <>
          <header className="page-head">
            <h1>{owner.name}</h1>
            <div className="page-intro">
              {isCustodianName(owner.name) && <CustodianLabel />}
              <p>
                {owner.kind !== "holder" && `${kindLabels[owner.kind]} · `}On the shareholder list
                of {companies(owner.companyCount)}
                {owner.totalValue !== null &&
                  `, with shares worth ${formatMarketCap(owner.totalValue)}`}
              </p>
              {owner.kind === "bucket" && (
                <p>
                  This name groups shareholders who aren’t listed one by one, so it doesn’t point to
                  a single owner.
                </p>
              )}
              {owner.listedSymbol && (
                <Link
                  className="page-link"
                  to="/company/$ticker"
                  params={{ ticker: owner.listedSymbol }}
                >
                  {owner.listedSymbol} company page →
                </Link>
              )}
            </div>
          </header>
          <NetworkGraph network={ownerNetwork(owner)} label={`What ${owner.name} owns`}>
            {owner.ownHolders.length > 0 ? (
              <>
                Above, shareholders with at least 1% of {owner.listedSymbol}. Below, the companies
                it holds
              </>
            ) : (
              <>Around it, the companies it holds</>
            )}
            , with their other shareholders of at least 1%. Bigger dots mean bigger stakes.
          </NetworkGraph>
          <h2 id="owner-holdings">Companies it holds</h2>
          <div
            className="owners-table-wrap"
            role="region"
            aria-label="Companies it holds"
            tabIndex={0}
          >
            <table className="owners-table owners-holdings">
              <caption>{companies(owner.holdings.length)}</caption>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Stake</th>
                  <th scope="col">Value</th>
                  <th scope="col">Other shareholders</th>
                </tr>
              </thead>
              <tbody>
                {owner.holdings.map((holding, index) => (
                  <tr key={`${holding.symbol}:${index}`} data-symbol={holding.symbol}>
                    <th scope="row">
                      <Link to="/company/$ticker" params={{ ticker: holding.symbol }}>
                        {holding.symbol}
                      </Link>
                      {holding.name && <small>{holding.name}</small>}
                      {holding.reportedName !== owner.name && (
                        <small>Named as {holding.reportedName}</small>
                      )}
                    </th>
                    <td>
                      {formatValue(holding.percentage, "percent")}
                      {holding.isLargest && <small>Largest shareholder</small>}
                    </td>
                    <td>{formatMarketCap(holding.value)}</td>
                    <td>
                      {holding.coHolders.length ? (
                        <details>
                          <summary>{holding.coHolders.length} others</summary>
                          <ul>
                            {holding.coHolders.map((holder, holderIndex) => (
                              <li key={`${holder.key}:${holderIndex}`}>
                                <Link to="/owner/$key" params={{ key: holder.key }}>
                                  {holder.name}
                                </Link>
                                <span>{formatValue(holder.percentage, "percent")}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        "None"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="owners-note">
            Stakes are from each company’s shareholder list. Public shares and shares a company
            holds in itself are left out. Source: {sourceLine(manifest.retrievedAt)}.
          </p>
          {owner.listedSymbol && (
            <section id="owner-upstream" className="owners-upstream">
              <h2>Who owns {owner.listedSymbol}</h2>
              {owner.ownHolders.length ? (
                <div
                  className="owners-table-wrap"
                  role="region"
                  aria-label={`Who owns ${owner.listedSymbol}`}
                  tabIndex={0}
                >
                  <table className="owners-table">
                    <caption>{owner.ownHolders.length} named shareholders</caption>
                    <thead>
                      <tr>
                        <th scope="col">Shareholder</th>
                        <th scope="col">Stake</th>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No named shareholders.</p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
