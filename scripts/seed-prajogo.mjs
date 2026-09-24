import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const environment = await readFile(resolve(root, ".env.local"), "utf8");
const deployment = /^CONVEX_DEPLOYMENT=(local:[^\s#]+)/m.exec(environment)?.[1];
if (
  !deployment ||
  /^CONVEX_DEPLOY_KEY=/m.test(environment) ||
  (process.env.CONVEX_DEPLOYMENT && process.env.CONVEX_DEPLOYMENT !== deployment) ||
  process.env.CONVEX_DEPLOY_KEY
) {
  throw new Error("This command only seeds a local Convex deployment without a deploy key");
}

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

await run("npx", ["convex", "run", "--deployment", "local", "seed:replacePrajogo", JSON.stringify({ deferBrokerImport: true })]);
await run(process.execPath, ["scripts/import-broker-days.mjs", "--all", "--apply"]);
