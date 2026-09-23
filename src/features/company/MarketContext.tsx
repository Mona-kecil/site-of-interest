import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function MarketContext({ empireSlug, ticker }: { empireSlug: string; ticker: string }) {
  const days = useQuery(api.marketSignals.byCompany, { empireSlug, ticker });
  return (
    <section className="company-card market-context">
      <header>
        <div>
          <p className="eyebrow">[market / observed trading days]</p>
          <h2>Market context</h2>
        </div>
        <span>{days?.length ?? 0} stored days</span>
      </header>
      {days === undefined ? (
        <p>Loading market records…</p>
      ) : days.length === 0 ? (
        <p className="table-note">
          No market days have been imported for {ticker}. This is a coverage gap, not zero volume.
        </p>
      ) : (
        <>
          <p className="table-note">
            Stored dates: {days.at(-1)?.tradingDate} to {days[0].tradingDate}. Price is the provider
            close in IDR; volume is shares.
          </p>
          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Open</th>
                  <th>High</th>
                  <th>Low</th>
                  <th>Close</th>
                  <th>Volume</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.tradingDate}>
                    <th>{day.tradingDate}</th>
                    <td>{day.open?.toLocaleString("en-US") ?? "—"}</td>
                    <td>{day.high?.toLocaleString("en-US") ?? "—"}</td>
                    <td>{day.low?.toLocaleString("en-US") ?? "—"}</td>
                    <td>{day.close.toLocaleString("en-US")}</td>
                    <td>{day.volume.toLocaleString("en-US")}</td>
                    <td>{day.source.endpoint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
