const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("browser feature scripts load after their declared API dependencies", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const scriptSources = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(([, attributes]) => /\bdefer\b/i.test(attributes))
    .map(([, attributes]) => attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1])
    .filter(Boolean)
    .map((source) => source.split("?")[0].replace(/^\.\//, ""))
    .filter(
      (source) =>
        source.endsWith(".js") && fs.existsSync(path.join(root, source)),
    );
  const featureFiles = fs
    .readdirSync(path.join(root, "features"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => `features/${entry.name}`)
    .sort();
  const loadedFeatureFiles = scriptSources
    .filter((source) => source.startsWith("features/"))
    .sort();

  assert.deepEqual(
    loadedFeatureFiles,
    featureFiles,
    "every feature JavaScript file belongs to the ordered browser shell",
  );

  const apiOwners = new Map();
  // Derive the browser dependency graph from the globals these scripts publish.
  const moduleSources = new Map(
    scriptSources.map((source) => [
      source,
      fs.readFileSync(path.join(root, source), "utf8"),
    ]),
  );

  for (const [source, contents] of moduleSources) {
    const declaredApis = new Set(
      [
        ...contents.matchAll(
          /(?:window|globalThis|target)\.(PropertyDesk\w+)\s*=/g,
        ),
      ].map(([, api]) => api),
    );
    for (const api of declaredApis) {
      const previousOwner = apiOwners.get(api);
      assert.ok(
        !previousOwner,
        `${api} is declared by both ${previousOwner} and ${source}`,
      );
      apiOwners.set(api, source);
    }
  }

  const apiConsumers = new Map(
    [...apiOwners.keys()].map((api) => [api, new Set()]),
  );
  for (const [dependent, contents] of moduleSources) {
    const referencedApis = new Set(
      [
        ...contents.matchAll(
          /(?:window|globalThis|target)\.(PropertyDesk\w+)\b/g,
        ),
      ].map(([, api]) => api),
    );
    for (const api of referencedApis) {
      const dependency = apiOwners.get(api);
      assert.ok(
        dependency,
        `${dependent} references ${api} without a browser script`,
      );
      if (dependency === dependent) continue;
      apiConsumers.get(api).add(dependent);

      assert.ok(
        scriptSources.indexOf(dependency) < scriptSources.indexOf(dependent),
        `${dependency} must load before ${dependent} (${api})`,
      );
    }
  }

  for (const [api, source] of apiOwners) {
    assert.ok(
      apiConsumers.get(api).size > 0,
      `${source} publishes ${api}, but no browser module uses it`,
    );
  }
});
