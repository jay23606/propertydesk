const assert = require("node:assert/strict");
const test = require("node:test");
const { loadAuthFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("password recovery saves the new password before resuming workspace access", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  loadAuthFeatures(context);
  const elements = new Map();
  const handlers = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "",
        disabled: false,
        textContent: "",
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
      });
    }
    return elements.get(id);
  };
  element("reset-password").value = "new-password-value";
  element("reset-password-confirm").value = "new-password-value";
  const calls = [];
  const state = {
    user: { id: "old-user" },
    passwordRecoveryInProgress: true,
    client: {
      auth: {
        async updateUser(payload) {
          calls.push(["update", payload]);
          return { data: { user: { id: "updated-user" } }, error: null };
        },
      },
    },
  };
  const feature = context.window.PropertyDeskAuthRecovery.create({
    $: element,
    state,
    toast: (message) => calls.push(["toast", message]),
    setAuthMode: (signup) => calls.push(["auth-mode", signup]),
    startWorkspace: async () => calls.push(["workspace"]),
    showAuth() {},
    windowRef: {
      location: { pathname: "/propertydesk/", search: "?from=reset" },
      history: { replaceState: (...args) => calls.push(["history", ...args]) },
    },
  });

  feature.attachEvents();
  await handlers.get("password-reset-form:submit")({ preventDefault() {} });

  assert.equal(calls[0][0], "update");
  assert.equal(calls[0][1].password, "new-password-value");
  assert.deepEqual(calls.at(-3), ["auth-mode", false]);
  assert.deepEqual(calls.at(-2), ["workspace"]);
  assert.deepEqual(calls.at(-1), ["toast", "Password updated"]);
  assert.equal(state.user.id, "updated-user");
  assert.equal(state.passwordRecoveryInProgress, false);
  assert.equal(element("reset-password-submit").disabled, false);
  assert.equal(element("reset-password-submit").textContent, "Update password");
});

test("password recovery restores its submit control when the auth request rejects", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  loadAuthFeatures(context);
  const elements = new Map();
  const handlers = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "new-password-value",
        disabled: false,
        textContent: "",
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
      });
    return elements.get(id);
  };
  element("reset-password-confirm").value = "new-password-value";
  const feature = context.window.PropertyDeskAuthRecovery.create({
    $: element,
    state: {
      user: { id: "owner-1" },
      passwordRecoveryInProgress: true,
      client: {
        auth: {
          async updateUser() {
            throw new Error("network unavailable");
          },
        },
      },
    },
    toast() {},
    setAuthMode() {},
    startWorkspace: async () => {},
    showAuth() {},
    windowRef: { location: { pathname: "/propertydesk/", search: "" } },
  });

  feature.attachEvents();
  await assert.doesNotReject(
    handlers.get("password-reset-form:submit")({ preventDefault() {} }),
  );
  assert.equal(element("reset-password-submit").disabled, false);
  assert.equal(element("reset-password-submit").textContent, "Update password");
  assert.match(element("auth-message").textContent, /try again/i);
});
