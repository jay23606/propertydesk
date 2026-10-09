const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app startup composes auth and lifecycle at the original event position", () => {
  const context = vm.createContext({ window: {} });
  const startupWorkflows = {
    auth: {
      modules: { screens: "auth-screens" },
      create(authContext) {
        assert.equal(authContext.getUser, getUser);
        assert.equal(authContext.setUser, setUser);
        assert.equal(
          authContext.getPasswordRecoveryInProgress,
          getPasswordRecoveryInProgress,
        );
        assert.equal(
          authContext.setPasswordRecoveryInProgress,
          setPasswordRecoveryInProgress,
        );
        assert.equal(authContext.resetWorkspaceState, resetWorkspaceState);
        assert.equal(authContext.$, selector);
        assert.equal(authContext.authClient, authClient);
        assert.deepEqual(Object.keys(authContext.authClient).sort(), [
          "getSession",
          "resetPasswordForEmail",
          "signInWithPassword",
          "signOut",
          "signUp",
          "updateUser",
        ]);
        assert.equal(authContext.fetchAll, fetchAll);
        assert.equal(authContext.toast, toast);
        assert.equal(authContext.paymentNotifications, paymentNotifications);
        assert.equal("unusedAuthContextValue" in authContext, false);
        assert.deepEqual(authContext.modules, { screens: "auth-screens" });
        assert.deepEqual(Object.keys(authContext).sort(), [
          "$",
          "authClient",
          "fetchAll",
          "getPasswordRecoveryInProgress",
          "getUser",
          "modules",
          "paymentNotifications",
          "resetWorkspaceState",
          "setPasswordRecoveryInProgress",
          "setUser",
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
        assert.equal(options.authClient, lifecycleAuthClient);
        assert.deepEqual(Object.keys(options.authClient), [
          "onAuthStateChange",
        ]);
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
  const authClient = {
    signUp() {},
    signInWithPassword() {},
    getSession() {},
    signOut() {},
    resetPasswordForEmail() {},
    updateUser() {},
  };
  const lifecycleAuthClient = { onAuthStateChange() {} };
  const selector = () => {};
  const fetchAll = async () => {};
  const toast = () => {};
  const paymentNotifications = { start() {}, stop() {} };
  const getUser = () => null;
  const setUser = () => {};
  const getPasswordRecoveryInProgress = () => false;
  const setPasswordRecoveryInProgress = () => {};
  const resetWorkspaceState = () => {};
  const startupContext = {
    authContext: {
      $: selector,
      getUser,
      setUser,
      getPasswordRecoveryInProgress,
      setPasswordRecoveryInProgress,
      resetWorkspaceState,
      fetchAll,
      toast,
      paymentNotifications,
      unusedAuthContextValue: true,
    },
    backendConfigured: true,
    initializeClient,
    authClient,
    lifecycleAuthClient,
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
  const setupSource = fs.readFileSync(
    path.join(root, "features", "app-startup-setup.js"),
    "utf8",
  );
  const workflow = "features/app-startup-workflow.js";
  const setup = "features/app-startup-setup.js";

  assert.ok(html.indexOf("features/auth.js") < html.indexOf(workflow));
  assert.ok(html.indexOf("features/app-lifecycle.js") < html.indexOf(workflow));
  assert.ok(html.indexOf(workflow) < html.indexOf(setup));
  assert.ok(html.indexOf(setup) < html.indexOf("app.js"));
  assert.ok(worker.includes(`'./${workflow}'`));
  assert.ok(worker.includes(`'./${setup}'`));
  assert.match(app, /PropertyDeskAppStartupSetup\.create\(/);
  assert.match(
    app,
    /records: \{[\s\S]*?\.\.\.stateAccess\.startup,\s*resetWorkspaceState,/,
  );
  assert.match(
    setupSource,
    /authContext: \{[\s\S]*?getUser: records\.getUser,[\s\S]*?paymentNotifications: services\.paymentNotifications,/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, "features", "auth.js"), "utf8"),
    /\bstate\b/,
  );
  assert.doesNotMatch(app, /PropertyDeskAuth\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskAppLifecycle\.create\(/);
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, workflow), "utf8"),
    /window\.PropertyDesk(?:Auth|AppLifecycle)\.create\(/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, "features", "auth.js"), "utf8"),
    /window\.PropertyDesk(?!Auth)/,
    "auth child workflows are explicit dependencies",
  );
});
