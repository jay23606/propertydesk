const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("record-entry support connects modals, form options, and reminders", () => {
  const calls = [];
  const methods = {
    attachModalEvents() {},
    openModal() {},
    closeModal() {},
    fillSelect() {},
    populateFormOptions() {},
    renderReminderActivity() {},
    previewReminderEmail() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskModalController: {
        create: (options) => {
          calls.push(["modal", options]);
          return {
            attachEvents: methods.attachModalEvents,
            openModal: methods.openModal,
            closeModal: methods.closeModal,
          };
        },
      },
      PropertyDeskFormOptions: {
        create: (options) => {
          calls.push(["form-options", options]);
          return {
            fillSelect: methods.fillSelect,
            populateFormOptions: methods.populateFormOptions,
          };
        },
      },
      PropertyDeskReminderWorkflow: {
        create: (options) => {
          calls.push(["reminders", options]);
          return {
            renderReminderActivity: methods.renderReminderActivity,
            previewReminderEmail: methods.previewReminderEmail,
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "record-entry-support-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const openArgs = {
    state: { accounts: [] },
    documentRef: {},
    propertyAddress() {},
    todayIso() {},
  };
  const workflow =
    context.window.PropertyDeskRecordEntrySupportWorkflow.create(openArgs);

  assert.deepEqual(
    calls.map(([name]) => name),
    ["modal", "form-options", "reminders"],
  );
  assert.equal(calls[0][1].state, openArgs.state);
  assert.equal(calls[1][1].propertyAddress, openArgs.propertyAddress);
  assert.equal(calls[2][1].openModal, methods.openModal);
  assert.equal(workflow.attachModalEvents, methods.attachModalEvents);
  assert.equal(workflow.openModal, methods.openModal);
  assert.equal(workflow.closeModal, methods.closeModal);
  assert.equal(workflow.fillSelect, methods.fillSelect);
  assert.equal(workflow.populateFormOptions, methods.populateFormOptions);
  assert.equal(workflow.renderReminderActivity, methods.renderReminderActivity);
  assert.equal(workflow.previewReminderEmail, methods.previewReminderEmail);
});

test("record-entry support loads after dependencies and is precached", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const coordinatorIndex = html.indexOf(
    "features/record-entry-support-workflow.js",
  );

  for (const dependency of [
    "features/modal-controller.js",
    "features/form-options.js",
    "features/reminder-workflow.js",
  ]) {
    assert.ok(
      html.indexOf(dependency) < coordinatorIndex,
      `${dependency} loads before record-entry support`,
    );
  }
  assert.ok(coordinatorIndex < html.indexOf("app.js"));
  assert.match(worker, /'\.\/features\/record-entry-support-workflow\.js'/);
});
