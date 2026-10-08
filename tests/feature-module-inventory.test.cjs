const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("every browser feature loads before app.js and is included in the PWA shell", () => {
  const root = path.join(__dirname, "..");
  const featuresDirectory = path.join(root, "features");
  const featureFiles = fs
    .readdirSync(featuresDirectory)
    .filter((filename) => filename.endsWith(".js"))
    .map((filename) => `features/${filename}`);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const scriptSources = Array.from(
    html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g),
    (match) => match[1].split("?")[0],
  );
  const cachedFiles = new Set(
    Array.from(
      serviceWorker.matchAll(/["']\.\/([^"']+)["']/g),
      (match) => match[1].split("?")[0],
    ),
  );
  const appIndex = scriptSources.indexOf("app.js");

  assert.notEqual(appIndex, -1, "index.html must load app.js");
  for (const feature of featureFiles) {
    assert.equal(
      scriptSources.filter((source) => source === feature).length,
      1,
      `${feature} must load exactly once`,
    );
    assert.ok(
      scriptSources.indexOf(feature) < appIndex,
      `${feature} must load before app.js`,
    );
    assert.ok(cachedFiles.has(feature), `${feature} must be precached`);
  }
});
