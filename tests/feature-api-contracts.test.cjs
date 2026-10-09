const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("feature module namespaces expose frozen API objects", () => {
  const featureDir = path.join(__dirname, "..", "features");
  const featureFiles = fs
    .readdirSync(featureDir)
    .filter((filename) => filename.endsWith(".js"));
  const mutableApis = [];
  let apiCount = 0;

  for (const filename of featureFiles) {
    const source = fs.readFileSync(path.join(featureDir, filename), "utf8");
    const assignments = source.matchAll(/window\.PropertyDesk\w+\s*=\s*/g);
    for (const assignment of assignments) {
      apiCount += 1;
      const initializer = source.slice(assignment.index + assignment[0].length);
      const alias = initializer.match(/^([A-Za-z_$][\w$]*);/)?.[1];
      const frozenAlias = alias
        ? new RegExp(`const\\s+${alias}\\s*=\\s*Object\\.freeze\\(\\{`).test(
            source,
          )
        : false;
      if (!initializer.startsWith("Object.freeze({") && !frozenAlias) {
        mutableApis.push(filename);
      }
    }
  }

  assert.ok(apiCount > 0, "feature module APIs are present");
  assert.deepEqual(mutableApis, []);
});
