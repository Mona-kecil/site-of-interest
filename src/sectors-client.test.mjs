import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSectorsClient } from "./sectors-client.mjs";

test("caches Sectors responses and accounts for credits once", async () => {
  const directory = await mkdtemp(join(tmpdir(), "site-of-interest-sectors-"));
  let calls = 0;
  try {
    const fetchImpl = async (url, options) => {
      calls += 1;
      assert.equal(url, "https://api.sectors.app/v2/example/");
      assert.equal(options.headers.Authorization, "test-key");
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    };
    const first = await createSectorsClient({ apiKey: "test-key", cacheDirectory: directory, fetchImpl });
    assert.deepEqual(await first.requestWithUsage("/v2/example/", 2), {
      body: { ok: true },
      usage: { remoteCalls: 1, cachedCalls: 0, credits: 2 },
    });
    assert.deepEqual(first.stats, { remoteCalls: 1, cachedCalls: 0, credits: 2 });

    const second = await createSectorsClient({ apiKey: "test-key", cacheDirectory: directory, fetchImpl });
    assert.deepEqual(await second.requestWithUsage("/v2/example/", 2), {
      body: { ok: true },
      usage: { remoteCalls: 0, cachedCalls: 1, credits: 0 },
    });
    assert.deepEqual(second.stats, { remoteCalls: 0, cachedCalls: 1, credits: 0 });
    assert.equal(calls, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects paths outside the Sectors v2 boundary", async () => {
  const client = await createSectorsClient({ apiKey: "test-key", fetchImpl: async () => assert.fail("fetch must not run") });
  await assert.rejects(client.request("https://example.com/steal", 1), /Sectors v2 API path/);
});
