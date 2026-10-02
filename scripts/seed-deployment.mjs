import { parseEnv } from "node:util";

export function getSeedDeployment(fileContents, env) {
  const fileEnv = parseEnv(fileContents);
  const deployment = fileEnv.CONVEX_DEPLOYMENT;
  if (
    !/^(local|anonymous|dev):[^\s#]+$/.test(deployment ?? "") ||
    Object.hasOwn(fileEnv, "CONVEX_DEPLOY_KEY") ||
    env.CONVEX_DEPLOY_KEY !== undefined ||
    (env.CONVEX_DEPLOYMENT !== undefined && env.CONVEX_DEPLOYMENT !== deployment)
  ) {
    throw new Error("Seeding requires local:, anonymous:, or dev: in .env.local with no environment override; production and deploy keys are refused.");
  }
  return deployment;
}
