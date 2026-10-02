import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function apiKeyFromEnvironment(root) {
  if (process.env.SECTORS_API_KEY) return process.env.SECTORS_API_KEY;
  if (!root) return null;
  try {
    const contents = await readFile(resolve(root, ".env.local"), "utf8");
    const line = contents.split(/\r?\n/).find((candidate) => candidate.startsWith("SECTORS_API_KEY="));
    return line?.slice("SECTORS_API_KEY=".length).trim().replace(/^['"]|['"]$/g, "") || null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function validatePath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/v2/")) throw new Error("pathname must be a Sectors v2 API path");
  return pathname;
}

function validateCredits(credits) {
  if (!Number.isInteger(credits) || credits < 0) throw new Error("credits must be a non-negative integer");
  return credits;
}

function cachePath(directory, pathname) {
  const key = createHash("sha256").update(pathname).digest("hex");
  return resolve(directory, `${key}.json`);
}

async function writeCache(target, body) {
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(body, null, 2)}\n`, { flag: "wx" });
  try {
    await rename(temporary, target);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export async function createSectorsClient({
  root,
  apiKey: suppliedApiKey,
  cacheDirectory = null,
  refresh = false,
  maxCredits = Infinity,
  fetchImpl = globalThis.fetch,
} = {}) {
  const apiKey = suppliedApiKey ?? await apiKeyFromEnvironment(root);
  if (!apiKey) throw new Error("SECTORS_API_KEY is missing");
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is missing");
  if (maxCredits !== Infinity) validateCredits(maxCredits);
  const stats = { remoteCalls: 0, cachedCalls: 0, credits: 0 };

  async function requestWithUsage(pathname, credits = 1) {
    validatePath(pathname);
    validateCredits(credits);
    const target = cacheDirectory ? cachePath(cacheDirectory, pathname) : null;
    if (target && !refresh) {
      try {
        const cached = JSON.parse(await readFile(target, "utf8"));
        const retrievedAt = (await stat(target)).mtime.toISOString();
        stats.cachedCalls += 1;
        return { body: cached, usage: { remoteCalls: 0, cachedCalls: 1, credits: 0, retrievedAt } };
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }

    if (stats.credits + credits > maxCredits) {
      throw new Error(`${pathname} would exceed the ${maxCredits}-credit run limit`);
    }

    const response = await fetchImpl(`https://api.sectors.app${pathname}`, { headers: { Authorization: apiKey } });
    const body = await response.json();
    if (!response.ok) throw new Error(`${pathname} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
    if (target) await writeCache(target, body);
    stats.remoteCalls += 1;
    stats.credits += credits;
    return { body, usage: { remoteCalls: 1, cachedCalls: 0, credits } };
  }

  async function request(pathname, credits = 1) {
    return (await requestWithUsage(pathname, credits)).body;
  }

  return Object.freeze({ request, requestWithUsage, stats });
}
