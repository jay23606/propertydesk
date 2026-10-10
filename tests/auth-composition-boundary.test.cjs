const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("auth coordinator gives each child only the auth operations it uses", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features/auth.js"), "utf8"),
    context,
  );

  const received = {};
  const windowRef = {};
  const documentRef = {};
  const authClient = Object.fromEntries(
    [
      "signUp",
      "signInWithPassword",
      "resetPasswordForEmail",
      "updateUser",
      "getSession",
      "signOut",
      "getUser",
      "onAuthStateChange",
    ].map((method) => [method, () => method]),
  );
  const modules = {
    screens: {
      create: (options) => {
        received.screensWindow = options.windowRef;
        received.screensDocument = options.documentRef;
        return {
          showAuth() {},
          showApp() {},
          showConfigError() {},
        };
      },
    },
    form: {
      create: (options) => {
        received.form = options.authClient;
        received.formDocument = options.documentRef;
        return { setAuthMode() {}, attachEvents() {} };
      },
    },
    recovery: {
      create: (options) => {
        received.recovery = options.authClient;
        received.recoveryWindow = options.windowRef;
        received.recoveryDocument = options.documentRef;
        return {
          showPasswordReset() {},
          isPasswordRecoverySession() {},
          attachEvents() {},
        };
      },
    },
    session: {
      create: (options) => {
        received.session = options.authClient;
        return {
          handleAuthStateChange() {},
          restoreAuthSession() {},
          signOut() {},
        };
      },
    },
  };

  context.window.PropertyDeskAuth.create({
    $: () => ({ addEventListener() {} }),
    windowRef,
    documentRef,
    authClient,
    modules,
  });

  assert.deepEqual(Object.keys(received.form).sort(), [
    "signInWithPassword",
    "signUp",
  ]);
  assert.deepEqual(Object.keys(received.recovery).sort(), [
    "resetPasswordForEmail",
    "updateUser",
  ]);
  assert.deepEqual(Object.keys(received.session).sort(), [
    "getSession",
    "signOut",
  ]);
  assert.equal(received.screensWindow, undefined);
  assert.equal(received.screensDocument, documentRef);
  assert.equal(received.formDocument, documentRef);
  assert.equal(received.recoveryWindow, windowRef);
  assert.equal(received.recoveryDocument, documentRef);
  for (const child of [received.form, received.recovery, received.session]) {
    assert.equal("getUser" in child, false);
    assert.equal("onAuthStateChange" in child, false);
  }
});

test("password reset request receives only its reset operation", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features/auth-recovery.js"), "utf8"),
    context,
  );

  let resetRequestClient;
  const windowRef = {};
  const documentRef = {};
  let viewDocument;
  context.window.PropertyDeskAuthRecovery.create({
    $: () => ({}),
    getUser() {},
    setUser() {},
    setPasswordRecoveryInProgress() {},
    authClient: {
      resetPasswordForEmail() {},
      updateUser() {},
      signOut() {},
    },
    toast() {},
    setAuthMode() {},
    startWorkspace() {},
    showAuth() {},
    windowRef,
    documentRef,
    viewModule: {
      create: (options) => {
        viewDocument = options.documentRef;
        return {};
      },
    },
    resetRequestModule: {
      create: ({ authClient, windowRef: receivedWindowRef }) => {
        resetRequestClient = authClient;
        assert.equal(receivedWindowRef, windowRef);
        return { requestPasswordReset() {} };
      },
    },
  });

  assert.deepEqual(Object.keys(resetRequestClient), ["resetPasswordForEmail"]);
  assert.equal(viewDocument, documentRef);
});
