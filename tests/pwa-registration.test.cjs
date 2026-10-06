const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("PWA registration runs only in a web context and reports registration failures", async () => {
  const context = vm.createContext({ window: {}, navigator: {}, console });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "pwa-registration.js"),
      "utf8",
    ),
    context,
  );
  const registerShell = context.window.PropertyDeskPwa.registerShell;
  const registrations = [];
  const warnings = [];
  const serviceWorker = {
    register(pathname) {
      registrations.push(pathname);
      return Promise.resolve();
    },
  };

  registerShell({
    navigatorRef: {},
    windowRef: { location: { protocol: "https:" } },
    logger: { warn: (...args) => warnings.push(args) },
  });
  registerShell({
    navigatorRef: { serviceWorker },
    windowRef: { location: { protocol: "file:" } },
    logger: { warn: (...args) => warnings.push(args) },
  });
  registerShell({
    navigatorRef: { serviceWorker },
    windowRef: { location: { protocol: "https:" } },
    logger: { warn: (...args) => warnings.push(args) },
  });
  assert.deepEqual(registrations, ["./sw.js"]);

  const failure = new Error("Registration failed");
  registerShell({
    navigatorRef: {
      serviceWorker: { register: () => Promise.reject(failure) },
    },
    windowRef: { location: { protocol: "https:" } },
    logger: { warn: (...args) => warnings.push(args) },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0], [
    "PropertyDesk shell cache could not be registered:",
    failure,
  ]);
});
