const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app chrome connects theme and navigation shell without changing event order", () => {
  const calls = [];
  const methods = {
    attachThemeEvents() {},
    updateGreeting() {},
    navigate() {},
    attachAppShellEvents() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskTheme: {
        create: () => {
          calls.push("theme");
          return { attachEvents: methods.attachThemeEvents };
        },
      },
      PropertyDeskAppShellWorkflow: {
        create: (dependencies) => {
          calls.push(["shell", dependencies]);
          return {
            updateGreeting: methods.updateGreeting,
            navigate: methods.navigate,
            attachEvents: methods.attachAppShellEvents,
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "app-chrome-workflow.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    state: { view: "properties" },
    renderReminderActivity() {},
  };
  const chrome =
    context.window.PropertyDeskAppChromeWorkflow.create(dependencies);

  assert.equal(calls[0], "theme");
  assert.equal(calls[1][0], "shell");
  assert.equal(calls[1][1], dependencies);
  assert.equal(chrome.attachThemeEvents, methods.attachThemeEvents);
  assert.equal(chrome.updateGreeting, methods.updateGreeting);
  assert.equal(chrome.navigate, methods.navigate);
  assert.equal(chrome.attachAppShellEvents, methods.attachAppShellEvents);
});

test("app chrome workflow loads after its features and is precached", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workflowIndex = html.indexOf("features/app-chrome-workflow.js");

  for (const dependency of [
    "features/theme-controller.js",
    "features/app-shell-workflow.js",
  ]) {
    assert.ok(
      html.indexOf(dependency) < workflowIndex,
      `${dependency} loads before app chrome`,
    );
  }
  assert.ok(workflowIndex < html.indexOf("app.js"));
  assert.match(worker, /'\.\/features\/app-chrome-workflow\.js'/);
});
