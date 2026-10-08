const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWorkflow() {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "workspace-write-reconciliation.js",
    "repository-write-feedback.js",
    "workspace-form-save-workflow.js",
    "property-maintenance.js",
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
    toast: (message) => events.push(["toast", message]),
  });
  const persist = async (payload, id, completion) => {
    events.push(["persist", payload, id]);
    completion.onSaved();
    events.push(["refresh"]);
    events.push(["toast", completion.successMessage]);
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

test("a form save confirmed by readback reuses its refresh before closing", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "workspace-write-reconciliation.js",
    "repository-write-feedback.js",
    "workspace-form-save-workflow.js",
    "property-maintenance.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const events = [];
  const property = { id: "property-1", address: "Old address" };
  const state = {
    workspaceOwnerId: "workspace-1",
    properties: [property],
  };
  const maintenance = context.window.PropertyDeskPropertyMaintenance.create({
    state,
    fetchAll: async () => {
      Object.assign(property, { address: "New address" });
      events.push("refresh");
    },
    toast: (message) => events.push(`toast:${message}`),
    repository: {
      save: async () => {
        throw new Error("connection lost");
      },
    },
  });
  const workflow = context.window.PropertyDeskWorkspaceFormSaveWorkflow.create({
    $: (id) => id,
    closeModal: (id) => events.push(`close:${id}`),
    toast: (message) => events.push(`toast:${message}`),
  });

  assert.equal(
    await workflow.save({
      persist: maintenance.saveProperty,
      payload: { address: "New address" },
      id: "property-1",
      modalId: "property-modal",
      resetForm: () => events.push("reset"),
      label: "Property",
    }),
    true,
  );
  assert.deepEqual(events, [
    "refresh",
    "close:property-modal",
    "reset",
    "toast:Property updated",
  ]);
});
