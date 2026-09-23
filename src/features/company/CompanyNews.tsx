import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function CompanyNews({ empireSlug, ticker }: { empireSlug: string; ticker: string }) {
  const records = useQuery(api.news.byCompany, { empireSlug, ticker });
  const coverage = useQuery(api.news.coverage, { empireSlug });
  return (
    <section className="company-card company-news">
      <header>
        <div>
          <p className="eyebrow">[news / exact ticker matches]</p>
          <h2>Company news</h2>
        </div>
        <span>{records?.length ?? 0} matched items</span>
      </header>
      <p className="table-note">
        {coverage
          ? `Sectors IDX news searched from ${coverage.start} to ${coverage.end}. ${coverage.importedCount} of ${coverage.totalCount} returned items imported${coverage.truncated ? "; later pages not fetched" : ""}.`
          : "News coverage has not been imported."}
      </p>
      {records === undefined ? (
        <p>Loading news records…</p>
      ) : records.length === 0 ? (
        <p className="table-note">
          No exact ticker match in the imported period. This does not mean there was no news.
        </p>
      ) : (
        <ul className="company-news-list">
          {records.map((record) => (
            <li key={record.stableId}>
              <a href={record.articleUrl} target="_blank" rel="noreferrer">
                {record.title}
              </a>
              <small>
                {record.publishedAt} · {record.sourceName} · matched by provider ticker
              </small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
