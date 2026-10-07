const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryFactory = /window\.PropertyDesk\w*Repository\.create\s*\(/g;
const databaseAccess = /\.(?:from|rpc)\s*\(/;
const dataAccessModules = new Set([
  "account-history-repository.js",
  "document-repository.js",
  "import-repository.js",
  "property-holder-repository.js",
  "repository-query-utils.js",
  "transaction-repository.js",
  "workspace-member-repository.js",
]);

test("feature workflows receive repository instances from the app composition root", () => {
  const featureDirectory = path.join(__dirname, "..", "features");
  const featureFiles = fs
    .readdirSync(featureDirectory)
    .filter((file) => file.endsWith(".js"));
  const internalFactories = featureFiles.flatMap((file) => {
    const source = fs.readFileSync(path.join(featureDirectory, file), "utf8");
    return [...source.matchAll(repositoryFactory)].map(() => file);
  });

  assert.deepEqual(internalFactories, []);

  const directDataAccess = featureFiles.filter((file) => {
    if (dataAccessModules.has(file)) return false;
    const source = fs.readFileSync(path.join(featureDirectory, file), "utf8");
    return databaseAccess.test(source);
  });
  assert.deepEqual(directDataAccess, []);

  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, repositoryFactory);
});
