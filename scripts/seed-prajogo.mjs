import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getSeedDeployment } from "./seed-deployment.mjs";

const root = resolve(import.meta.dirname, "..");
const environment = await readFile(resolve(root, ".env.local"), "utf8");
const deployment = getSeedDeployment(environment, process.env);

async function run(command, args) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.once("error", rejectRun);
    child.once("exit", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with status ${code}`));
    });
  });
}

console.log(`Seeding Convex deployment: ${deployment}`);
await run("npx", ["convex", "run", "seed:replacePrajogo", "{}"]);
