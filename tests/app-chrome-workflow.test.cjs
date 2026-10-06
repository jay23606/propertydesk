const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app root wires theme, workspace settings, and navigation separately", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(app, /PropertyDeskTheme\.create\(\)/);
  assert.match(app, /PropertyDeskWorkspace\.create\(\{/);
  assert.match(app, /PropertyDeskNavigation\.create\(\{/);
  assert.match(
    app,
    /workspace\.renderWorkspaceSettings\(\);[\s\S]*?renderReminderActivity\(\);/,
  );
  assert.match(
    app,
    /attachNavigationEvents\(\);[\s\S]*?workspace\.attachEvents\(\);/,
  );
  assert.match(app, /attachEvents: attachThemeEvents/);
  assert.doesNotMatch(app, /PropertyDeskAppChromeWorkflow/);
  for (const feature of [
    "features/theme-controller.js",
    "features/navigation.js",
    "features/workspace.js",
  ]) {
    assert.ok(
      html.indexOf(feature) >= 0 &&
        html.indexOf(feature) < html.indexOf("app.js"),
      `${feature} loads before app.js`,
    );
    assert.match(worker, new RegExp(`'\\./${feature.replaceAll("/", "\\/")}'`));
  }
  assert.doesNotMatch(html, /app-shell-workflow\.js/);
  assert.doesNotMatch(worker, /app-shell-workflow\.js/);
  assert.doesNotMatch(html, /app-chrome-workflow\.js/);
  assert.doesNotMatch(worker, /app-chrome-workflow\.js/);
});
