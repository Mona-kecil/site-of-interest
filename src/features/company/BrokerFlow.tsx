import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { compareBrokerFlow } from "./broker-flow-model";

export function BrokerFlow({ empireSlug, ticker }: { empireSlug: string; ticker: string }) {
  const days = useQuery(api.brokerSignals.byCompany, { empireSlug, ticker });
  const [selectedDate, setSelectedDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const rangeStart = start || days?.[0]?.tradingDate || "";
  const rangeEnd = end || days?.[0]?.tradingDate || "";
  const selected = days?.find((day) => day.tradingDate === selectedDate) ?? days?.[0];
  const periodDays =
    days?.filter((day) => day.tradingDate >= rangeStart && day.tradingDate <= rangeEnd) ?? [];
  const baselineDays = days?.filter((day) => day.tradingDate < rangeStart).slice(0, 60) ?? [];
  const aggregate = compareBrokerFlow(periodDays, baselineDays);
  const brokers = selected?.brokers.slice().sort((a, b) => b.buy.value - a.buy.value);
  const totalBuy = selected?.brokers.reduce((sum, row) => sum + row.buy.value, 0) ?? 0;

  return (
    <section className="company-card broker-flow">
      <header>
        <div>
          <p className="eyebrow">[broker / observed exchange members]</p>
          <h2>Broker flow</h2>
        </div>
        <span>{days?.length ?? 0} recent stored days</span>
      </header>
      {days === undefined ? (
        <p>Loading broker records…</p>
      ) : days.length === 0 ? (
        <p className="table-note">
          No broker days have been imported for {ticker}. This is a coverage gap, not zero activity.
        </p>
      ) : (
        <>
          <div className="broker-range">
            <label>
              From{" "}
              <input
                type="date"
                value={rangeStart}
                min={days.at(-1)?.tradingDate}
                max={rangeEnd}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label>
              To{" "}
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart}
                max={days[0].tradingDate}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </div>
          <p className="table-note">
            {periodDays.length} stored trading days selected, from{" "}
            {periodDays.at(-1)?.tradingDate ?? "—"} to {periodDays[0]?.tradingDate ?? "—"}. Missing
            dates are not counted as zero activity.
          </p>
          <p className="table-note">
            Previous-session baseline: {baselineDays.length} of 60 stored sessions before{" "}
            {rangeStart}
            {baselineDays.length === 60
              ? `, from ${baselineDays.at(-1)?.tradingDate} to ${baselineDays[0]?.tradingDate}.`
              : ". The comparison is a coverage gap until all 60 are stored."}
          </p>
          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Buy value</th>
                  <th>Sell value</th>
                  <th>Net value</th>
                  <th>Buy lots</th>
                  <th>Sell lots</th>
                  <th>Net lots</th>
                  <th>Days</th>
                  <th>Buy share</th>
                  <th>Previous 60 share</th>
                  <th>Change, pp</th>
                </tr>
              </thead>
              <tbody>
                {aggregate.map((row) => (
                  <tr key={row.brokerCode}>
                    <th>{row.brokerCode}</th>
                    <td>{row.buyValue.toLocaleString("en-US")}</td>
                    <td>{row.sellValue.toLocaleString("en-US")}</td>
                    <td>{row.netValue.toLocaleString("en-US")}</td>
                    <td>{row.buyLots.toLocaleString("en-US")}</td>
                    <td>{row.sellLots.toLocaleString("en-US")}</td>
                    <td>{row.netLots.toLocaleString("en-US")}</td>
                    <td>{row.activeDays}</td>
                    <td>{row.buyShare === null ? "—" : `${row.buyShare.toFixed(2)}%`}</td>
                    <td>{row.previousShare === null ? "—" : `${row.previousShare.toFixed(2)}%`}</td>
                    <td>
                      {row.shareChangePoints === null ? "—" : row.shareChangePoints.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-note">
            Buy share = broker buy value ÷ all observed broker buy value × 100 in each period.
            Change is selected-period share minus previous-60-session share, in percentage points.
            These totals use only stored days; no investor identity or intent is inferred.
          </p>
          <label>
            Inspect source trading day
            <select
              value={selected?.tradingDate ?? ""}
              onChange={(event) => setSelectedDate(event.target.value)}
            >
              {days.map((day) => (
                <option key={day.tradingDate} value={day.tradingDate}>
                  {day.tradingDate}
                </option>
              ))}
            </select>
          </label>
          <p className="table-note">
            {brokers?.length ?? 0} brokers observed. Total buy value:{" "}
            {totalBuy.toLocaleString("en-US")} IDR. Sort: buy value descending.
          </p>
          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Buy value</th>
                  <th>Sell value</th>
                  <th>Net value</th>
                  <th>Buy lots</th>
                  <th>Sell lots</th>
                  <th>Buy average</th>
                  <th>Sell average</th>
                </tr>
              </thead>
              <tbody>
                {brokers?.map((row) => (
                  <tr key={row.brokerCode}>
                    <th>{row.brokerCode}</th>
                    <td>{row.buy.value.toLocaleString("en-US")}</td>
                    <td>{row.sell.value.toLocaleString("en-US")}</td>
                    <td>{row.net.value.toLocaleString("en-US")}</td>
                    <td>{row.buy.lots.toLocaleString("en-US")}</td>
                    <td>{row.sell.lots.toLocaleString("en-US")}</td>
                    <td>{row.buy.averagePrice?.toLocaleString("en-US") ?? "—"}</td>
                    <td>{row.sell.averagePrice?.toLocaleString("en-US") ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-note">
            Source: Sectors {selected?.source.endpoint}. Retrieved {selected?.source.retrievedAt}. A
            broker code does not identify the beneficial investor.
          </p>
        </>
      )}
    </section>
  );
}
