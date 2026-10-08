const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("every feature module loads before app.js and every local script is precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const localScripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(([, attributes]) => /\bdefer\b/i.test(attributes))
    .map(([, attributes]) => attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1])
    .filter((source) => source && !/^https?:\/\//i.test(source))
    .map((source) => source.split("?")[0].replace(/^\.\//, ""));
  const shellMatch = worker.match(/const SHELL_FILES\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(shellMatch, "service worker defines its shell file list");
  const shellFiles = new Set(
    [...shellMatch[1].matchAll(/["']([^"']+)["']/g)].map(([, source]) =>
      source.replace(/^\.\//, ""),
    ),
  );
  const appIndex = localScripts.indexOf("app.js");
  assert.notEqual(appIndex, -1, "app.js is loaded");
  assert.equal(
    appIndex,
    localScripts.length - 1,
    "app.js is the last local deferred script",
  );
  const featureModules = fs
    .readdirSync(path.join(__dirname, "..", "features"))
    .filter((filename) => filename.endsWith(".js"))
    .map((filename) => `features/${filename}`);
  for (const featureModule of featureModules) {
    assert.ok(
      localScripts.includes(featureModule),
      `${featureModule} is loaded by index.html`,
    );
  }
  for (const source of localScripts) {
    assert.ok(
      shellFiles.has(source),
      `${source} is cached by the service worker`,
    );
  }
});
