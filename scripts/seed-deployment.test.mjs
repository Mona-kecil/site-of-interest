import assert from "node:assert/strict";
import test from "node:test";

import { getSeedDeployment } from "./seed-deployment.mjs";

for (const deployment of ["local:local-project", "anonymous:anonymous-project", "dev:kindred-sturgeon-374"]) {
  test(`seed deployment guard accepts ${deployment.split(":")[0]} deployments`, () => {
    assert.equal(getSeedDeployment(`CONVEX_DEPLOYMENT=${deployment}\n`, {}), deployment);
  });
}

const deployment = "dev:kindred-sturgeon-374";
const fileContents = `CONVEX_DEPLOYMENT=${deployment}\n`;

test("seed deployment guard strips trailing comments", () => {
  assert.equal(getSeedDeployment(`${fileContents.trim()} # team comment\r\n`, {}), deployment);
});

test("seed deployment guard accepts a matching environment deployment", () => {
  assert.equal(getSeedDeployment(fileContents, { CONVEX_DEPLOYMENT: deployment }), deployment);
});

test("seed deployment guard accepts quoted values and whitespace", () => {
  assert.equal(getSeedDeployment(`  export CONVEX_DEPLOYMENT = "${deployment}" # comment\n`, {}), deployment);
});

test("seed deployment guard ignores commented deploy keys", () => {
  assert.equal(getSeedDeployment(`${fileContents}# CONVEX_DEPLOY_KEY=refused\n`, {}), deployment);
});

for (const [label, contents, env] of [
  ["missing deployment", "", {}],
  ["commented deployment", `# ${fileContents}`, {}],
  ["empty deployment", "CONVEX_DEPLOYMENT=\n", {}],
  ["missing deployment name", "CONVEX_DEPLOYMENT=dev:\n", {}],
  ["production deployment", "CONVEX_DEPLOYMENT=prod:project\n", {}],
  ["preview deployment", "CONVEX_DEPLOYMENT=preview:project\n", {}],
  ["unknown deployment type", "CONVEX_DEPLOYMENT=other:project\n", {}],
  ["deployment without a type", "CONVEX_DEPLOYMENT=project\n", {}],
  ["deployment only in the environment", "", { CONVEX_DEPLOYMENT: deployment }],
  ["file deploy key", `${fileContents}CONVEX_DEPLOY_KEY=refused\n`, {}],
  ["empty file deploy key", `${fileContents}CONVEX_DEPLOY_KEY=\n`, {}],
  ["file deploy key with whitespace", `${fileContents} export CONVEX_DEPLOY_KEY = refused\n`, {}],
  ["environment deploy key", fileContents, { CONVEX_DEPLOY_KEY: "refused" }],
  ["empty environment deploy key", fileContents, { CONVEX_DEPLOY_KEY: "" }],
  ["different environment deployment", fileContents, { CONVEX_DEPLOYMENT: "dev:other-project" }],
  ["production environment override", fileContents, { CONVEX_DEPLOYMENT: "prod:project" }],
  ["empty environment override", fileContents, { CONVEX_DEPLOYMENT: "" }],
  ["duplicate production override", `${fileContents}CONVEX_DEPLOYMENT=prod:project\n`, {}],
]) {
  test(`seed deployment guard rejects ${label}`, () => {
    assert.throws(
      () => getSeedDeployment(contents, env),
      /local:, anonymous:, or dev:.*production and deploy keys are refused/,
    );
  });
}
