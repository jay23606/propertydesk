const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("workflow coordinators do not return mutable interface objects", () => {
  const featureDirectory = path.join(__dirname, "..", "features");
  const workflowFiles = fs
    .readdirSync(featureDirectory)
    .filter((file) => file.endsWith("-workflow.js"));

  for (const file of workflowFiles) {
    const source = fs.readFileSync(path.join(featureDirectory, file), "utf8");
    assert.doesNotMatch(source, /\breturn\s+\{/u, file);
  }
});

test("event routers do not return mutable interface objects", () => {
  const featureDirectory = path.join(__dirname, "..", "features");
  const eventFiles = fs
    .readdirSync(featureDirectory)
    .filter((file) => file.endsWith("-events.js"));

  for (const file of eventFiles) {
    const source = fs.readFileSync(path.join(featureDirectory, file), "utf8");
    assert.doesNotMatch(source, /\breturn\s+\{/u, file);
  }
});

test("database queries stay inside repository adapters", () => {
  const featureDirectory = path.join(__dirname, "..", "features");
  const featureFiles = fs
    .readdirSync(featureDirectory)
    .filter((file) => file.endsWith(".js"));
  const queryFiles = featureFiles.filter((file) =>
    /\.(from|rpc)\s*\(/u.test(
      fs.readFileSync(path.join(featureDirectory, file), "utf8"),
    ),
  );
  const allowedFiles = new Set([
    "repository-query-utils.js",
    ...featureFiles.filter((file) => file.endsWith("-repository.js")),
  ]);

  for (const file of queryFiles) {
    assert.equal(allowedFiles.has(file), true, file);
  }
});
