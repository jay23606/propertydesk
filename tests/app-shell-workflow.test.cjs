const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("app shell workflow exposes settings and keeps event binders explicit", () => {
  const calls = [];
  const handlers = {
    renderWorkspaceSettings() {},
    attachWorkspaceEvents() {},
    previewReminderEmail() {},
    navigate() {},
    attachNavigationEvents() {},
    attachThemeEvents() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspaceSettingsWorkflow: {
        create(options) {
          calls.push(["settings", options]);
          return {
            renderWorkspaceSettings: handlers.renderWorkspaceSettings,
            attachWorkspaceEvents: handlers.attachWorkspaceEvents,
            previewReminderEmail: handlers.previewReminderEmail,
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
    fs.readFileSync(path.join(root, "features", "app-shell-workflow.js"), "utf8"),
    context,
  );

  const options = { $: () => {}, state: { view: "properties" } };
  const shell = context.window.PropertyDeskAppShellWorkflow.create(options);

  assert.deepEqual(Object.keys(shell).sort(), [
    "attachNavigationEvents",
    "attachThemeEvents",
    "attachWorkspaceEvents",
    "navigate",
    "previewReminderEmail",
  ].sort());
  assert.equal(calls[0][0], "settings");
  assert.equal(calls[0][1], options);
  assert.equal(calls[1][1].renderWorkspaceSettings, handlers.renderWorkspaceSettings);
  assert.deepEqual(calls.map(([name]) => name), ["settings", "navigation", "theme"]);
  assert.equal(shell.attachWorkspaceEvents, handlers.attachWorkspaceEvents);
  assert.equal(shell.attachNavigationEvents, handlers.attachNavigationEvents);
  assert.equal(shell.attachThemeEvents, handlers.attachThemeEvents);
});

test("app shell workflow loads before the coordinator and is precached", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

  assert.ok(html.indexOf("features/app-shell-workflow.js") < html.indexOf("app.js"));
  assert.match(worker, /'\.\/features\/app-shell-workflow\.js'/);
  assert.match(app, /PropertyDeskAppShellWorkflow\.create/);
  assert.doesNotMatch(app, /PropertyDeskNavigation\.create/);
  assert.doesNotMatch(app, /PropertyDeskTheme\.create/);
});
