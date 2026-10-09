const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app startup setup maps state, UI bindings, services, and workflows", () => {
  const root = path.join(__dirname, "..");
  const window = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "features/app-startup-setup.js"), "utf8"),
    { window },
  );

  const records = Object.fromEntries(
    [
      "getUser",
      "setUser",
      "getPasswordRecoveryInProgress",
      "setPasswordRecoveryInProgress",
      "resetWorkspaceState",
    ].map((name) => [name, () => name]),
  );
  records.unusedRecordValue = true;
  const ui = Object.fromEntries(
    ["$", "todayIso", "toast"].map((name) => [name, () => name]),
  );
  ui.renderers = [() => {}];
  ui.eventBindersBeforeAuth = [() => {}];
  ui.eventBindersAfterAuth = [() => {}];
  ui.unusedUiValue = true;
  const services = Object.fromEntries(
    [
      "backendConfigured",
      "initializeClient",
      "registerShell",
      "authClient",
      "fetchAll",
      "paymentNotifications",
    ].map((name) => [name, { name }]),
  );
  services.unusedServiceValue = true;
  const received = {};
  const result = { initialize() {}, render() {} };
  const workflows = {
    startup: {
      create(options) {
        Object.assign(received, options);
        return result;
      },
    },
    auth: { create() {}, modules: {} },
    lifecycle: { create() {} },
  };

  assert.equal(
    window.PropertyDeskAppStartupSetup.create({
      records,
      ui,
      services,
      workflows,
    }),
    result,
  );
  assert.equal(received.backendConfigured, services.backendConfigured);
  assert.equal(received.initializeClient, services.initializeClient);
  assert.equal(received.registerShell, services.registerShell);
  assert.equal(received.authContext.getUser, records.getUser);
  assert.equal(received.authContext.setUser, records.setUser);
  assert.equal(
    received.authContext.getPasswordRecoveryInProgress,
    records.getPasswordRecoveryInProgress,
  );
  assert.equal(
    received.authContext.resetWorkspaceState,
    records.resetWorkspaceState,
  );
  assert.equal(
    received.authContext.paymentNotifications,
    services.paymentNotifications,
  );
  assert.deepEqual(Object.keys(received.authContext).sort(), [
    "$",
    "fetchAll",
    "getPasswordRecoveryInProgress",
    "getUser",
    "paymentNotifications",
    "resetWorkspaceState",
    "setPasswordRecoveryInProgress",
    "setUser",
    "toast",
  ]);
  assert.equal(received.renderers, ui.renderers);
  assert.equal(received.eventBindersBeforeAuth, ui.eventBindersBeforeAuth);
  assert.equal(received.eventBindersAfterAuth, ui.eventBindersAfterAuth);
  assert.equal(received.workflows.auth, workflows.auth);
  assert.equal(received.workflows.lifecycle, workflows.lifecycle);
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, "features/app-startup-setup.js"), "utf8"),
    /\bstate\./,
  );
});
