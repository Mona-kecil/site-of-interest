// Convex allows 8,192 elements per array; snapshot maxima: inputs 12, holdings 14, symbols 20.
export const IMPORT_ARRAY_CAP = 256;

export function arrayBounds(tables, cap) {
  if (!Number.isSafeInteger(cap) || cap < 0) throw new Error("Array cap must be a nonnegative safe integer");
  return Object.fromEntries(Object.entries(tables).map(([table, rows]) => {
    const maxima = {};
    for (const [index, row] of rows.entries()) {
      const key = row.key ?? row.slug ?? row.id ?? ([row.symbol, row.year ?? row.quarter ?? row.checkId ?? row.holderKey].filter((part) => part !== undefined).join(":") || index);
      for (const [column, value] of Object.entries(row)) {
        if (!Array.isArray(value)) continue;
        maxima[column] = Math.max(maxima[column] ?? 0, value.length);
        if (value.length > cap) throw new Error(`${table}.${column}: row ${key} has ${value.length} elements (cap ${cap})`);
      }
    }
    return [table, maxima];
  }));
}
