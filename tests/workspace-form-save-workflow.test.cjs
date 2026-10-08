const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWorkflow() {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "repository-write-feedback.js",
    "workspace-form-save-workflow.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  return context.window.PropertyDeskWorkspaceFormSaveWorkflow;
}

test("shared workspace form save closes, resets, refreshes, and labels add or edit", async () => {
  const events = [];
  const workflow = loadWorkflow().create({
    $: (id) => ({ id }),
    closeModal: ({ id }) => events.push(["close", id]),
    fetchAll: async () => events.push(["refresh"]),
    toast: (message) => events.push(["toast", message]),
  });
  const persist = async (payload, id) => {
    events.push(["persist", payload, id]);
    return true;
  };
  const resetForm = () => events.push(["reset"]);

  assert.equal(
    await workflow.save({
      persist,
      payload: { address: "10 Main St" },
      id: "",
      modalId: "property-modal",
      resetForm,
      label: "Property",
    }),
    true,
  );
  assert.equal(
    await workflow.save({
      persist,
      payload: { party_name: "Buyer" },
      id: "account-1",
      modalId: "account-modal",
      resetForm,
      label: "Account",
    }),
    true,
  );

  assert.deepEqual(events, [
    ["persist", { address: "10 Main St" }, ""],
    ["close", "property-modal"],
    ["reset"],
    ["refresh"],
    ["toast", "Property added"],
    ["persist", { party_name: "Buyer" }, "account-1"],
    ["close", "account-modal"],
    ["reset"],
    ["refresh"],
    ["toast", "Account updated"],
  ]);
});

test("failed workspace form persistence leaves the form open and unchanged", async () => {
  const events = [];
  const workflow = loadWorkflow().create({
    $: (id) => ({ id }),
    closeModal: () => events.push(["close"]),
    fetchAll: async () => events.push(["refresh"]),
    toast: (message) => events.push(["toast", message]),
  });

  assert.equal(
    await workflow.save({
      persist: async () => {
        events.push(["persist"]);
        return false;
      },
      payload: {},
      id: "property-1",
      modalId: "property-modal",
      resetForm: () => events.push(["reset"]),
      label: "Property",
    }),
    false,
  );
  assert.deepEqual(events, [["persist"]]);
});
