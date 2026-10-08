const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryFactory = /window\.PropertyDesk\w*Repository\.create\s*\(/g;
const databaseAccess = /\.(?:from|rpc)\s*\(/;
const authClientAccess =
  /\.auth\.(?:onAuthStateChange|signUp|signInWithPassword|getSession|getUser|signOut|resetPasswordForEmail|updateUser)\s*\(/;
const dataAccessModules = new Set([
  "account-history-repository.js",
  "account-repository.js",
  "deposit-repository.js",
  "document-repository.js",
  "import-repository.js",
  "property-holder-repository.js",
  "property-repository.js",
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

  const directAuthAccess = featureFiles.filter((file) => {
    if (file === "auth-client.js") return false;
    const source = fs.readFileSync(path.join(featureDirectory, file), "utf8");
    return authClientAccess.test(source);
  });
  assert.deepEqual(directAuthAccess, []);

  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const runtime = fs.readFileSync(
    path.join(featureDirectory, "workspace-runtime.js"),
    "utf8",
  );
  assert.match(runtime, /workflows\.repositoryRegistry\.create\(/);
  assert.doesNotMatch(app, repositoryFactory);
});
