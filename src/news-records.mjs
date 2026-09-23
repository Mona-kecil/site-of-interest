import { createHash } from "node:crypto";

export function normalizeNewsResponse(response, { tickers, endpoint, retrievedAt }) {
  if (!response || !Array.isArray(response.results) || !response.pagination) {
    throw new Error("News response must contain results and pagination");
  }
  const allowed = new Set(tickers);
  const records = response.results.map((item, index) => {
    if (typeof item.title !== "string" || !item.title.trim()) throw new Error(`News item ${index} has no title`);
    if (typeof item.source !== "string" || !item.source.startsWith("https://")) throw new Error(`News item ${index} has no HTTPS source URL`);
    if (typeof item.timestamp !== "string" || Number.isNaN(Date.parse(item.timestamp))) throw new Error(`News item ${index} has no valid timestamp`);
    if (!Array.isArray(item.symbols)) throw new Error(`News item ${index} has no symbols array`);
    const matchedTickers = [...new Set(item.symbols.map((symbol) => {
      if (typeof symbol !== "string") throw new Error(`News item ${index} has an invalid symbol`);
      return symbol.toUpperCase().replace(/\.JK$/, "");
    }).filter((ticker) => allowed.has(ticker)))].sort();
    const stableId = createHash("sha256")
      .update(`${item.source}\n${item.timestamp}\n${item.title}`)
      .digest("hex");
    return {
      stableId,
      empireSlug: "prajogo",
      title: item.title,
      articleUrl: item.source,
      sourceName: new URL(item.source).hostname,
      publishedAt: item.timestamp,
      matchedTickers,
      matchRule: "provider_symbol_exact",
      provider: "sectors",
      sourceEndpoint: endpoint,
      retrievedAt,
    };
  });
  return {
    records: records.filter((item) => item.matchedTickers.length > 0),
    hasNext: response.pagination.has_next === true,
    nextOffset: response.pagination.next_offset,
    totalCount: response.pagination.total_count,
  };
}
