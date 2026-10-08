const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app startup composes auth and lifecycle at the original event position", () => {
  const context = vm.createContext({ window: {} });
  const startupWorkflows = {
    auth: {
      create(authContext) {
        assert.equal(authContext.state.name, "shared-state");
        assert.equal(authContext.$, selector);
        assert.equal(authContext.authClient, authClient);
        assert.equal(authContext.fetchAll, fetchAll);
        assert.equal(authContext.toast, toast);
        assert.equal(authContext.paymentNotifications, paymentNotifications);
        assert.deepEqual(Object.keys(authContext).sort(), [
          "$",
          "authClient",
          "fetchAll",
          "paymentNotifications",
          "state",
          "toast",
        ]);
        return {
          setAuthMode() {},
          showConfigError() {},
          handleAuthStateChange() {},
          restoreAuthSession() {},
          attachEvents() {},
        };
      },
    },
    lifecycle: {
      create(options) {
        assert.equal("unusedStartupValue" in options, false);
        assert.equal(options.backendConfigured, true);
        assert.equal(options.initializeClient, initializeClient);
        assert.equal(options.authClient, authClient);
        assert.equal(options.renderers, renderers);
        assert.equal(options.eventBinders[0], firstBinder);
        assert.equal(options.eventBinders[1], secondBinder);
        assert.equal(options.eventBinders.length, 4);
        assert.equal(typeof options.eventBinders[2], "function");
        assert.equal(options.eventBinders[3], thirdBinder);
        assert.equal(typeof options.auth.handleAuthStateChange, "function");
        return { initialize() {}, render() {} };
      },
    },
  };
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "app-startup-workflow.js"),
      "utf8",
    ),
    context,
  );

  const renderers = [() => {}];
  const firstBinder = () => {};
  const secondBinder = () => {};
  const thirdBinder = () => {};
  const initializeClient = () => {};
  const authClient = {};
  const selector = () => {};
  const fetchAll = async () => {};
  const toast = () => {};
  const paymentNotifications = { start() {}, stop() {} };
  const startupContext = {
    authContext: {
      $: selector,
      state: { name: "shared-state" },
      fetchAll,
      toast,
      paymentNotifications,
      unusedStartupValue: true,
    },
    backendConfigured: true,
    initializeClient,
    authClient,
    renderers,
    eventBindersBeforeAuth: [firstBinder, secondBinder],
    eventBindersAfterAuth: [thirdBinder],
    workflows: startupWorkflows,
    unusedStartupValue: true,
  };
  const lifecycle =
    context.window.PropertyDeskAppStartupWorkflow.create(startupContext);

  assert.equal("authClient" in startupContext.authContext, false);
  assert.deepEqual(Object.keys(lifecycle).sort(), ["initialize", "render"]);
});

test("app startup workflow loads after auth and lifecycle and is precached", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const workflow = "features/app-startup-workflow.js";

  assert.ok(html.indexOf("features/auth.js") < html.indexOf(workflow));
  assert.ok(html.indexOf("features/app-lifecycle.js") < html.indexOf(workflow));
  assert.ok(html.indexOf(workflow) < html.indexOf("app.js"));
  assert.ok(worker.includes(`'./${workflow}'`));
  assert.match(app, /PropertyDeskAppStartupWorkflow\.create\(/);
  assert.match(
    app,
    /workflows: \{\s*auth: window\.PropertyDeskAuth,\s*lifecycle: window\.PropertyDeskAppLifecycle,/,
  );
  assert.doesNotMatch(app, /PropertyDeskAuth\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskAppLifecycle\.create\(/);
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, workflow), "utf8"),
    /window\.PropertyDesk(?:Auth|AppLifecycle)\.create\(/,
  );
});
