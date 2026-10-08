const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("every feature API is consumed by another runtime module", () => {
  const root = path.join(__dirname, "..");
  const featureDirectory = path.join(root, "features");
  const featureFiles = fs
    .readdirSync(featureDirectory)
    .filter((filename) => filename.endsWith(".js"));
  const runtimeFiles = [
    "app.js",
    "workspace-data.js",
    "workspace-query.js",
    "workspace-table-catalog.js",
    ...featureFiles.map((filename) => path.join("features", filename)),
  ];
  const runtimeModules = runtimeFiles.map((filename) => ({
    filename,
    source: fs.readFileSync(path.join(root, filename), "utf8"),
  }));

  for (const filename of featureFiles) {
    const featurePath = path.join("features", filename);
    const source = fs.readFileSync(path.join(root, featurePath), "utf8");
    for (const [, api] of source.matchAll(/window\.(PropertyDesk\w+)\s*=/g)) {
      const reference = new RegExp(`window\\.${api}\\b`);
      const hasConsumer = runtimeModules.some(
        (runtimeModule) =>
          runtimeModule.filename !== featurePath &&
          reference.test(runtimeModule.source),
      );
      assert.ok(hasConsumer, `${api} in ${filename} has a runtime consumer`);
    }
  }
});
