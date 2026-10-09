const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadStore(storage, toast = () => {}) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features/reminder-template-store.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskReminderTemplateStore.create({
    storage,
    toast,
  });
}

test("template store supplies a shared default for each channel", () => {
  const store = loadStore({ getItem: () => null, setItem() {} });
  assert.equal(store.getTemplate("email").id, "default-email");
  assert.equal(store.getTemplate("sms").id, "default-sms");
  assert.match(
    store.getTemplate("email").body,
    /earlier balances or late fees/,
  );
});

test("template store normalizes invalid active IDs and ignores malformed items", () => {
  const saved = JSON.stringify({
    email: {
      activeId: "missing",
      items: [null, { id: "custom", name: "Custom", body: "Hello" }],
    },
    sms: { activeId: "missing", items: [] },
  });
  const store = loadStore({ getItem: () => saved, setItem() {} });
  assert.equal(store.getTemplate("email").id, "custom");
  assert.equal(store.getTemplate("sms").id, "default-sms");
});

test("template store reports browser storage failures without throwing", () => {
  const messages = [];
  const store = loadStore(
    {
      getItem: () => null,
      setItem() {
        throw new Error("storage unavailable");
      },
    },
    (message, level) => messages.push([message, level]),
  );
  assert.equal(store.write({}), false);
  assert.deepEqual(messages, [
    ["Template settings could not be saved in this browser.", "error"],
  ]);
});
