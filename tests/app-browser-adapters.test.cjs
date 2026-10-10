const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("app browser adapters wrap native APIs through explicit references", () => {
  const source = fs.readFileSync(
    path.join(root, "features/app-browser-adapters.js"),
    "utf8",
  );
  const calls = [];
  const values = new Map();
  const window = {
    confirm(message) {
      calls.push(["confirm", message]);
      return true;
    },
    prompt(message, initialValue) {
      calls.push(["prompt", message, initialValue]);
      return "entered";
    },
    open(...args) {
      calls.push(["open", ...args]);
      return "opened";
    },
    crypto: { randomUUID: () => "generated-id" },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    URL: { createObjectURL() {} },
    setTimeout(callback, delay) {
      assert.equal(this, window);
      calls.push(["timeout", callback, delay]);
      return 17;
    },
    console: {
      error(...args) {
        calls.push(["error", ...args]);
      },
    },
  };
  const listeners = new Map();
  const document = {
    getElementById: (id) => ({ id }),
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
  };
  const downloads = [];
  const downloadUtils = {
    downloadBlob(...args) {
      downloads.push(args);
      return "downloaded";
    },
  };
  const context = vm.createContext({ window });
  vm.runInContext(source, context);

  const adapters = window.PropertyDeskAppBrowserAdapters.create({
    windowRef: window,
    documentRef: document,
    downloadUtils,
  });

  assert.equal(Object.isFrozen(adapters), true);
  assert.equal(adapters.$("property-address").id, "property-address");
  assert.equal(adapters.confirmAction("Close account?"), true);
  assert.equal(adapters.promptAction("Reason", "Late"), "entered");
  assert.equal(adapters.openWindow("about:blank", "_blank"), "opened");
  assert.equal(adapters.makeId(), "generated-id");
  let ready = false;
  adapters.onDomContentLoaded(() => {
    ready = true;
  });
  assert.equal(ready, false);
  listeners.get("DOMContentLoaded")();
  assert.equal(ready, true);
  assert.equal(adapters.browserStorage.getItem("theme"), null);
  adapters.browserStorage.setItem("theme", "dark");
  assert.equal(adapters.browserStorage.getItem("theme"), "dark");

  const blob = {};
  assert.equal(adapters.downloadBlob(blob, "backup.zip"), "downloaded");
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0][0], blob);
  assert.equal(downloads[0][1], "backup.zip");
  assert.equal(downloads[0][2].documentRef, document);
  assert.equal(downloads[0][2].urlRef, window.URL);
  assert.equal(
    adapters.schedule(() => {}, 250),
    17,
  );
  assert.equal(
    downloads[0][2].defer(() => {}, 1000),
    17,
  );
  assert.equal(adapters.reportError("failed", "details"), undefined);
  assert.deepEqual(
    calls.map(([name]) => name),
    ["confirm", "prompt", "open", "timeout", "timeout", "error"],
  );
});

test("app browser adapters load after download helper and are cached", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const adapterScript = "features/app-browser-adapters.js";

  assert.ok(
    html.indexOf("features/download-utils.js") < html.indexOf(adapterScript),
  );
  assert.ok(html.indexOf(adapterScript) < html.indexOf("app.js?v="));
  assert.ok(worker.includes(`'./${adapterScript}'`));
  assert.match(app, /PropertyDeskAppBrowserAdapters\.create\(/);
});

test("feature modules do not default to global browser capabilities", () => {
  const featureDirectory = path.join(root, "features");
  const hiddenBrowserDefaults =
    /\b(?:documentRef|windowRef|navigatorRef)\s*=\s*(?:document|window|navigator)\b|\b(?:documentRef|windowRef|navigatorRef)\s*\|\|\s*(?:document|window|navigator)\b|\blogger\s*=\s*console\b/;

  for (const filename of fs.readdirSync(featureDirectory)) {
    if (!filename.endsWith(".js")) continue;
    const source = fs.readFileSync(
      path.join(featureDirectory, filename),
      "utf8",
    );
    assert.doesNotMatch(source, hiddenBrowserDefaults, filename);
  }
});
