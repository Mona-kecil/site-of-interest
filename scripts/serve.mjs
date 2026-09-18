import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

import { createOnDemandBrokerFlow } from "../src/on-demand-flow.mjs";
import { createSectorsClient } from "../src/sectors-client.mjs";

const root = resolve(process.cwd());
const port = Number(process.env.PORT ?? 4174);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8"
};
let brokerFlowPromise = null;

function brokerFlow() {
  if (!brokerFlowPromise) {
    brokerFlowPromise = createSectorsClient({
      root,
      cacheDirectory: resolve(root, ".cache/sectors"),
    }).then((sectors) => createOnDemandBrokerFlow({
      directory: resolve(root, "data/market-flow"),
      sectors,
    })).catch((error) => {
      brokerFlowPromise = null;
      throw error;
    });
  }
  return brokerFlowPromise;
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  }).end(`${JSON.stringify(body)}\n`);
}

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const flowMatch = /^\/api\/flow\/([^/]+)$/.exec(pathname);
  if (flowMatch) {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }
    try {
      sendJson(response, 200, await (await brokerFlow()).load(flowMatch[1]));
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Flow request failed" });
    }
    return;
  }
  const requested = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (requested !== root && !requested.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const file = await stat(requested);
    if (!file.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(requested)] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(requested).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Site of Interest: http://127.0.0.1:${port}`);
});
