const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("app lifecycle preserves render, event-binding, and startup order", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "app-lifecycle.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const elements = new Map();
  let todayReads = 0;
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, { value: "" });
    return elements.get(id);
  };
  const auth = {
    setAuthMode: (value) => calls.push(`auth-mode:${value}`),
    showConfigError: () => calls.push("config-error"),
    handleAuthStateChange: () => calls.push("auth-change"),
    restoreAuthSession: async () => calls.push("restore-session"),
  };
  const lifecycle = context.window.PropertyDeskAppLifecycle.create({
    $,
    authClient: {
      onAuthStateChange(handler) {
        assert.equal(handler, auth.handleAuthStateChange);
        calls.push("subscribe-auth");
      },
    },
    backendConfigured: true,
    initializeClient() {
      calls.push("create-client");
      return { auth: {} };
    },
    todayIso: () => {
      todayReads += 1;
      return "2026-10-05";
    },
    registerShell: () => calls.push("register-shell"),
    auth,
    renderers: [() => calls.push("greeting"), () => calls.push("properties")],
    eventBinders: [() => calls.push("modals"), () => calls.push("navigation")],
  });

  assert.deepEqual(Object.keys(lifecycle).sort(), ["initialize", "render"]);
  lifecycle.render();
  await lifecycle.initialize();

  assert.deepEqual(calls, [
    "greeting",
    "properties",
    "modals",
    "navigation",
    "auth-mode:false",
    "register-shell",
    "create-client",
    "subscribe-auth",
    "restore-session",
  ]);
  assert.equal($("payment-date").value, "2026-10-05");
  assert.equal($("account-start").value, "2026-10-05");
  assert.equal(todayReads, 1);
});

test("app lifecycle shows the configuration error before creating a client", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "app-lifecycle.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const lifecycle = context.window.PropertyDeskAppLifecycle.create({
    $: () => ({ value: "" }),
    authClient: { onAuthStateChange() {} },
    backendConfigured: false,
    initializeClient() {
      calls.push("create-client");
    },
    todayIso: () => "2026-10-05",
    registerShell: () => calls.push("register-shell"),
    auth: {
      setAuthMode: (value) => calls.push(`auth-mode:${value}`),
      showConfigError: () => calls.push("config-error"),
      handleAuthStateChange() {},
      restoreAuthSession: async () => calls.push("restore-session"),
    },
    renderers: [],
    eventBinders: [],
  });

  await lifecycle.initialize();
  assert.deepEqual(calls, [
    "auth-mode:false",
    "register-shell",
    "config-error",
  ]);
});
