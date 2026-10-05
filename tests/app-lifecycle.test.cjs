const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("app lifecycle preserves render, event-binding, and startup order", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "app-lifecycle.js"), "utf8"),
    context,
  );
  const calls = [];
  const elements = new Map();
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
    state: { client: null },
    backend: {
      configured: true,
      createClient() {
        calls.push("create-client");
        return {
          auth: {
            onAuthStateChange(handler) {
              assert.equal(handler, auth.handleAuthStateChange);
              calls.push("subscribe-auth");
            },
          },
        };
      },
    },
    todayIso: () => "2026-10-05",
    registerShell: () => calls.push("register-shell"),
    auth,
    renderers: [() => calls.push("greeting"), () => calls.push("properties")],
    eventBinders: [() => calls.push("modals"), () => calls.push("navigation")],
  });

  lifecycle.render();
  await lifecycle.initialize();

  assert.deepEqual(calls, [
    "greeting", "properties", "modals", "navigation",
    "auth-mode:false", "register-shell", "create-client",
    "subscribe-auth", "restore-session",
  ]);
  assert.equal($("payment-date").value, "2026-10-05");
  assert.equal($("account-start").value, "2026-10-05");
});

test("app lifecycle shows the configuration error before creating a client", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "app-lifecycle.js"), "utf8"),
    context,
  );
  const calls = [];
  const lifecycle = context.window.PropertyDeskAppLifecycle.create({
    $: () => ({ value: "" }),
    state: {},
    backend: {
      configured: false,
      createClient() {
        calls.push("create-client");
      },
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
  assert.deepEqual(calls, ["auth-mode:false", "register-shell", "config-error"]);
});
