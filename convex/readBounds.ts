export async function takeBounded<T>(query: { take(limit: number): Promise<T[]> }, limit: number) {
  const rows = await query.take(limit + 1);
  if (rows.length > limit) throw new Error(`Stored read exceeds ${limit} rows`);
  return rows;
}
