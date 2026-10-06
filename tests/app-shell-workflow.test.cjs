const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("app shell workflow owns settings and groups shell event binding", () => {
  const calls = [];
  const handlers = {
    renderWorkspaceSettings() {},
    attachWorkspaceEvents() {
      calls.push("workspace events attached");
    },
    renderReminderActivity() {},
    navigate() {},
    attachNavigationEvents() {
      calls.push("navigation events attached");
    },
    attachThemeEvents() {
      calls.push("theme events attached");
    },
  };
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspace: {
        create(options) {
          calls.push(["settings", options]);
          return {
            renderWorkspaceSettings: handlers.renderWorkspaceSettings,
            attachEvents: handlers.attachWorkspaceEvents,
          };
        },
      },
      PropertyDeskNavigation: {
        create(options) {
          calls.push(["navigation", options]);
          return {
            navigate: handlers.navigate,
            attachEvents: handlers.attachNavigationEvents,
          };
        },
      },
      PropertyDeskTheme: {
        create() {
          calls.push(["theme"]);
          return { attachEvents: handlers.attachThemeEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(root, "features", "app-shell-workflow.js"),
      "utf8",
    ),
    context,
  );

  const options = {
    $: () => {},
    state: { view: "properties" },
    esc() {},
    toast() {},
    fetchAll() {},
    updateGreeting() {},
    renderReminderActivity() {},
    unrelatedDependency() {},
  };
  const shell = context.window.PropertyDeskAppShellWorkflow.create(options);

  assert.deepEqual(Object.keys(shell).sort(), ["attachEvents", "navigate"]);
  assert.equal(calls[0][0], "settings");
  assert.notEqual(calls[0][1], options);
  assert.deepEqual(
    Object.keys(calls[0][1]).sort(),
    [
      "$",
      "esc",
      "fetchAll",
      "renderReminderActivity",
      "state",
      "toast",
      "updateGreeting",
    ].sort(),
  );
  assert.equal(calls[0][1].state, options.state);
  assert.equal(
    calls[0][1].renderReminderActivity,
    options.renderReminderActivity,
  );
  assert.equal(
    calls[1][1].renderWorkspaceSettings,
    handlers.renderWorkspaceSettings,
  );
  assert.deepEqual(
    calls.map(([name]) => name),
    ["settings", "navigation", "theme"],
  );
  shell.attachEvents();
  assert.deepEqual(calls.slice(-3), [
    "theme events attached",
    "navigation events attached",
    "workspace events attached",
  ]);
});

test("app shell workflow loads before the coordinator and is precached", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

  assert.ok(
    html.indexOf("features/app-shell-workflow.js") < html.indexOf("app.js"),
  );
  assert.doesNotMatch(html, /workspace-settings-workflow\.js/);
  assert.doesNotMatch(worker, /workspace-settings-workflow\.js/);
  assert.match(worker, /'\.\/features\/app-shell-workflow\.js'/);
  assert.match(app, /PropertyDeskAppShellWorkflow\.create/);
  assert.match(app, /PropertyDeskReminderWorkflow\.create/);
  assert.match(app, /attachAccountFormEvents\(previewReminderEmail\)/);
  assert.match(app, /renderReminderActivity/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:ReminderActivityView|ReminderPreview)\.create/,
  );
  assert.doesNotMatch(app, /PropertyDeskNavigation\.create/);
  assert.doesNotMatch(app, /PropertyDeskTheme\.create/);
});
