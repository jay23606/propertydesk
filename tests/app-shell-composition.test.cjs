const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app shell composes workspace, navigation, and reminder activity", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const workflow = fs.readFileSync(
    path.join(root, "features", "app-shell-workflow.js"),
    "utf8",
  );
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(app, /PropertyDeskAppShellWorkflow\.create\(\{/);
  assert.match(workflow, /PropertyDeskWorkspace\.create\(\{/);
  assert.match(workflow, /PropertyDeskNavigation\.create\(\{/);
  assert.match(
    workflow,
    /function renderWorkspaceSettings\(\) \{\s*workspace\.renderWorkspaceSettings\(\);\s*renderReminderActivity\(\);/,
  );
  assert.match(
    app,
    /eventBinders:[\s\S]*?attachNavigationEvents,\s*attachProfileEvents,\s*attachWorkspaceMemberEvents,/,
  );
  assert.doesNotMatch(app, /attachAppShellEvents/);
  for (const script of [
    "features/workspace.js",
    "features/navigation.js",
    "features/app-shell-workflow.js",
  ]) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
    );
    assert.ok(worker.includes(`'./${script}'`), `${script} is precached`);
  }
});

test("app shell refreshes reminder activity with workspace settings", () => {
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspace: {
        create: () => ({
          renderWorkspaceSettings() {
            events.push("workspace");
          },
          updateGreeting() {},
          attachProfileEvents() {},
          attachWorkspaceMemberEvents() {},
        }),
      },
      PropertyDeskNavigation: {
        create({ renderWorkspaceSettings }) {
          settingsRenderer = renderWorkspaceSettings;
          return { navigate() {}, attachEvents() {} };
        },
      },
    },
  });
  const events = [];
  let settingsRenderer;
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "app-shell-workflow.js"),
      "utf8",
    ),
    context,
  );

  const shell = context.window.PropertyDeskAppShellWorkflow.create({
    $() {},
    state: {},
    esc() {},
    toast() {},
    fetchAll() {},
    renderReminderActivity() {
      events.push("reminders");
    },
  });
  settingsRenderer();

  assert.deepEqual(events, ["workspace", "reminders"]);
  assert.equal(typeof shell.attachNavigationEvents, "function");
  assert.equal(typeof shell.attachProfileEvents, "function");
  assert.equal(typeof shell.attachWorkspaceMemberEvents, "function");
});
