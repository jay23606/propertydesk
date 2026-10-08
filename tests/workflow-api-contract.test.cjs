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
