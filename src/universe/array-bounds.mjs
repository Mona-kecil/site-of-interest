// Convex allows 8,192 elements per array; snapshot maxima: inputs 12, holdings 14, symbols 20.
export const IMPORT_ARRAY_CAP = 256;

export function arrayBounds(tables, cap) {
  return Object.fromEntries(Object.entries(tables).map(([table, rows]) => {
    const maxima = {};
    for (const [index, row] of rows.entries()) {
      for (const [column, value] of Object.entries(row)) {
        if (!Array.isArray(value)) continue;
        maxima[column] = Math.max(maxima[column] ?? 0, value.length);
        if (value.length > cap) throw new Error(`${table}.${column}: row ${index} has ${value.length} elements (cap ${cap})`);
      }
    }
    return [table, maxima];
  }));
}
