const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createView() {
  const elements = new Map();
  const listeners = new Map();
  const calls = [];
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === "expense-category" ? "deposit_refund" : "",
        textContent: "",
        reset() {
          calls.push("reset-form");
        },
        addEventListener(event, handler) {
          listeners.set(`${id}:${event}`, handler);
        },
        querySelector: () => ({ textContent: "" }),
        classList: {
          add: (...args) => calls.push([id, "add", ...args]),
          remove: (...args) => calls.push([id, "remove", ...args]),
          toggle: (...args) => calls.push([id, "toggle", ...args]),
        },
      });
    }
    return elements.get(id);
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "expense-entry-view.js"),
      "utf8",
    ),
    context,
  );
  const state = {
    accounts: [
      { id: "a1", property_id: "p1", name: "Rent", account_type: "rental" },
      { id: "a2", property_id: "p2", name: "Note", account_type: "note" },
    ],
    pendingCorrection: { kind: "expense" },
  };
  const view = context.window.PropertyDeskExpenseEntryView.create({
    $,
    state,
    todayIso: () => "2026-10-05",
    fillSelect: (...args) => calls.push(["fillSelect", ...args]),
    populateFormOptions: () => calls.push("populate-options"),
    prettyType: (value) => value,
    openModal: (id) => calls.push(["open-modal", id]),
  });
  return { calls, elements, listeners, state, view };
}

test("expense view prepares a fresh dated entry scoped to an optional property", () => {
  const { calls, elements, state, view } = createView();

  view.openExpense("p1");

  assert.equal(state.pendingCorrection, null);
  assert.ok(calls.indexOf("populate-options") < calls.indexOf("reset-form"));
  assert.equal(elements.get("expense-date").value, "2026-10-05");
  assert.equal(elements.get("expense-property").value, "p1");
  assert.ok(
    calls.some(
      (call) => call[0] === "open-modal" && call[1] === "expense-modal",
    ),
  );
  assert.ok(
    calls.some(
      (call) => call[0] === "deposit-refund-hint" && call[1] === "add",
    ),
  );
});

test("expense view refreshes account choices and deposit-refund guidance", () => {
  const { calls, elements, listeners, view } = createView();
  view.attachEvents();
  elements.get("expense-property").value = "p1";
  listeners.get("expense-property:change")();
  listeners.get("expense-category:change")();
  elements.get("expense-category").value = "repairs";
  listeners.get("expense-category:change")();

  const accountOptions = calls.find((call) => call[0] === "fillSelect");
  assert.equal(accountOptions[1], "expense-account");
  assert.deepEqual(JSON.parse(JSON.stringify(accountOptions[2])), [
    { value: "a1", label: "Rent — rental" },
  ]);
  assert.equal(accountOptions[3], "Property level");
  assert.deepEqual(
    calls.filter(
      (call) => Array.isArray(call) && call[0] === "deposit-refund-hint",
    ),
    [
      ["deposit-refund-hint", "toggle", "hidden", false],
      ["deposit-refund-hint", "toggle", "hidden", true],
    ],
  );
});
