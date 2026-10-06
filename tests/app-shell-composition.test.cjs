const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app composes workspace settings, navigation, and reminder history", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workspaceIndex = app.indexOf("PropertyDeskWorkspace.create(");
  const navigationIndex = app.indexOf("PropertyDeskNavigation.create(");

  assert.ok(workspaceIndex >= 0 && navigationIndex > workspaceIndex);
  assert.match(
    app,
    /function renderWorkspaceSettings\(\) \{\s*workspace\.renderWorkspaceSettings\(\);\s*renderReminderActivity\(\);/,
  );
  assert.match(
    app,
    /eventBinders:[\s\S]*?attachNavigationEvents,\s*attachProfileEvents,\s*attachWorkspaceMemberEvents,/,
  );
  assert.doesNotMatch(app, /attachAppShellEvents/);
  for (const script of ["features/workspace.js", "features/navigation.js"]) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
    );
    assert.ok(worker.includes(`'./${script}'`), `${script} is precached`);
  }
  assert.doesNotMatch(app, /PropertyDeskAppShellWorkflow\.create\(/);
  assert.doesNotMatch(html, /app-shell-workflow\.js/);
  assert.doesNotMatch(worker, /app-shell-workflow\.js/);
});
