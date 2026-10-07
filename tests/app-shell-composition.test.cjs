const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Workspace navigation coordinates settings rendering and page routing", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workspace = fs.readFileSync(
    path.join(root, "features", "workspace.js"),
    "utf8",
  );
  const workflow = fs.readFileSync(
    path.join(root, "features", "workspace-navigation-workflow.js"),
    "utf8",
  );

  assert.match(
    app,
    /WorkspaceNavigationWorkflow\.create\(\{[\s\S]*?renderReminderActivity,[\s\S]*?documentRef: document,[\s\S]*?windowRef: window,/,
  );
  assert.match(
    workflow,
    /PropertyDeskNavigation\.create\(\{[\s\S]*?renderWorkspaceSettings: workspace\.renderWorkspaceSettings,/,
  );
  assert.match(
    workspace,
    /function renderWorkspacePage\(\)\s*\{\s*renderWorkspaceSettings\(\);\s*renderReminderActivity\(\);/,
  );
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachNavigationEvents,\s*attachProfileEvents,\s*attachWorkspaceMemberEvents,/,
  );
  for (const script of [
    "features/workspace.js",
    "features/navigation.js",
    "features/workspace-navigation-workflow.js",
  ]) {
    assert.ok(html.indexOf(script) < html.indexOf("app.js"));
    assert.ok(worker.includes(`'./${script}'`));
  }
});
