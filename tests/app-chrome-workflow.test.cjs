const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("device-local theme controls remain independent at the app root", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(app, /PropertyDeskTheme\.create\(\{\s*storage: browserStorage,/);
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachNavigationEvents,\s*attachProfileEvents,\s*attachWorkspaceMemberEvents,/,
  );
  assert.match(app, /attachEvents: attachThemeEvents/);
  assert.doesNotMatch(app, /PropertyDeskAppChromeWorkflow/);
  for (const feature of ["features/theme-controller.js"]) {
    assert.ok(
      html.indexOf(feature) >= 0 &&
        html.indexOf(feature) < html.indexOf("app.js"),
      `${feature} loads before app.js`,
    );
    assert.match(worker, new RegExp(`'\\./${feature.replaceAll("/", "\\/")}'`));
  }
  assert.doesNotMatch(html, /app-chrome-workflow\.js/);
  assert.doesNotMatch(worker, /app-chrome-workflow\.js/);
});
