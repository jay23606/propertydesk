const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("app entry form setup composes shared form infrastructure with scoped inputs", () => {
  const window = {};
  vm.runInNewContext(
    fs.readFileSync(
      path.join(root, "features/app-entry-form-setup.js"),
      "utf8",
    ),
    { window },
  );

  const options = {};
  const records = {
    modal: {
      setPendingImport() {},
      setPendingCorrection() {},
      advanceAuditRequestId() {},
    },
    formOptions: { getProperties() {}, getAccounts() {} },
    reminderPreview: { getProperties() {}, getPayments() {} },
  };
  const ui = Object.fromEntries(
    [
      "$",
      "documentRef",
      "esc",
      "propertyAddress",
      "prettyType",
      "monthEnd",
      "dateOnly",
      "monthStart",
      "money",
      "todayIso",
      "moneyInput",
      "toast",
    ].map((key) => [key, () => key]),
  );
  const services = Object.fromEntries(
    [
      "paymentReminderMessage",
      "amountDueSince",
      "unpaidDueAccrualStart",
      "splitEmailAddresses",
    ].map((key) => [key, () => key]),
  );
  const operations = {
    attachEvents() {},
    closeModal() {},
    openModal() {},
  };
  const formOperations = {
    fillSelect() {},
    populateFormOptions() {},
  };
  const previewReminderEmail = () => {};
  const modules = {
    modal: {
      create(input) {
        options.modal = input;
        return operations;
      },
    },
    formOptions: {
      create(input) {
        options.formOptions = input;
        return formOperations;
      },
    },
    formOptionModules: { domainOptions: {}, transactionOptions: {} },
    reminderPreviewSetup: {
      create(input) {
        options.reminderPreview = input;
        return { previewReminderEmail };
      },
    },
    reminderPreview: { model: {}, preview: {} },
  };

  const setup = window.PropertyDeskAppEntryFormSetup.create({
    records,
    ui,
    services,
    modules,
  });

  assert.deepEqual(Object.keys(setup).sort(), [
    "attachModalEvents",
    "closeModal",
    "fillSelect",
    "openModal",
    "populateFormOptions",
    "previewReminderEmail",
  ]);
  assert.equal(setup.attachModalEvents, operations.attachEvents);
  assert.equal(setup.closeModal, operations.closeModal);
  assert.equal(setup.openModal, operations.openModal);
  assert.equal(setup.fillSelect, formOperations.fillSelect);
  assert.equal(setup.populateFormOptions, formOperations.populateFormOptions);
  assert.equal(setup.previewReminderEmail, previewReminderEmail);
  assert.equal(options.modal.documentRef, ui.documentRef);
  assert.equal(options.modal.setPendingImport, records.modal.setPendingImport);
  assert.equal(
    options.modal.setPendingCorrection,
    records.modal.setPendingCorrection,
  );
  assert.equal(
    options.formOptions.getProperties,
    records.formOptions.getProperties,
  );
  assert.equal(
    options.formOptions.getAccounts,
    records.formOptions.getAccounts,
  );
  assert.equal(options.formOptions.modules, modules.formOptionModules);
  assert.equal(options.reminderPreview.records, records.reminderPreview);
  assert.equal(options.reminderPreview.ui.openModal, operations.openModal);
  assert.equal(
    options.reminderPreview.services.paymentReminderMessage,
    services.paymentReminderMessage,
  );
  assert.equal(options.reminderPreview.workflows, modules.reminderPreview);
});

test("app entry form modules load before the app and are precached", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const setup = "features/app-entry-form-setup.js";
  const catalog = "features/app-entry-form-module-catalog.js";

  assert.ok(html.indexOf(setup) < html.indexOf(catalog));
  assert.ok(html.indexOf(catalog) < html.indexOf("app.js?v="));
  assert.ok(worker.includes(`'./${setup}'`));
  assert.ok(worker.includes(`'./${catalog}'`));
  assert.match(app, /PropertyDeskAppEntryFormSetup\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:ModalController|FormOptions|ReminderPreviewSetup)\.create\(/,
  );
});
