import { describe, expect, it, vi } from "vitest";
import { takeBounded } from "../../convex/readBounds";

describe("stored read bounds", () => {
  it.each([
    { name: "empty", rows: [] },
    { name: "below the bound", rows: [1] },
    { name: "at the bound", rows: [1, 2] },
  ])("returns every row when $name", async ({ rows }) => {
    const take = vi.fn(async (limit: number) => rows.slice(0, limit));
    await expect(takeBounded({ take }, 2)).resolves.toEqual(rows);
    expect(take).toHaveBeenCalledWith(3);
  });

  it("throws instead of returning a truncated result above the bound", async () => {
    const rows = [1, 2, 3];
    const take = vi.fn(async (limit: number) => rows.slice(0, limit));
    await expect(takeBounded({ take }, 2)).rejects.toThrow("Stored read exceeds 2 rows");
    expect(take).toHaveBeenCalledWith(3);
  });
});
