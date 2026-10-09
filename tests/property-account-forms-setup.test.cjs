const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property and account form setup maps scoped inputs to separate forms", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-account-forms-setup.js"),
    "utf8",
  );
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);

  let received;
  const result = {
    attachPropertyFormEvents() {},
    attachAccountFormEvents() {},
  };
  const forms = {
    create(options) {
      received = options;
      return result;
    },
  };
  const records = {
    getProperties: () => "properties",
    getAccounts: () => "accounts",
    getWorkspaceOwnerId: () => "owner",
  };
  const uiKeys = [
    "$",
    "moneyInput",
    "todayIso",
    "toast",
    "closeModal",
    "populateFormOptions",
    "openModal",
    "previewReminderEmail",
  ];
  const ui = Object.fromEntries(uiKeys.map((key) => [key, () => key]));
  const serviceKeys = [
    "fetchAll",
    "propertyRepository",
    "accountRepository",
    "saveWorkspaceRecord",
    "saveAndRefreshWorkspaceRecord",
  ];
  const services = Object.fromEntries(serviceKeys.map((key) => [key, { key }]));
  const propertyFormModules = { key: "property-modules" };
  const accountFormModules = { key: "account-modules" };
  const accountPayload = { build: () => "payload" };
  const accountFormModel = { create: () => "model" };
  const emailAddressUtils = { key: "email" };
  const selectRecordWriteCompletion = { key: "completion" };
  const workflows = {
    forms,
    propertyForm: { key: "property-form" },
    accountForm: { key: "account-form" },
    propertyFormModules,
    accountFormModules,
    accountPayload,
    accountFormModel,
    emailAddressUtils,
    recordWrite: { selectRecordWriteCompletion },
  };

  assert.equal(
    context.window.PropertyDeskPropertyAccountFormsSetup.create({
      records,
      ui,
      services,
      workflows,
    }),
    result,
  );
  assert.equal(received.property.getProperties, records.getProperties);
  assert.equal(
    received.property.getWorkspaceOwnerId,
    records.getWorkspaceOwnerId,
  );
  assert.equal(received.property.repository, services.propertyRepository);
  assert.equal(received.account.getAccounts, records.getAccounts);
  assert.equal(received.account.repository, services.accountRepository);
  assert.equal(received.account.previewReminderEmail, ui.previewReminderEmail);
  assert.equal(received.account.buildAccountPayload, accountPayload.build);
  assert.equal(received.account.formModel, "model");
  assert.equal(
    received.property.selectRecordWriteCompletion,
    selectRecordWriteCompletion,
  );
  assert.equal(received.workflows.propertyFormModules, propertyFormModules);
  assert.equal(received.workflows.accountFormModules, accountFormModules);
  assert.doesNotMatch(source, /\bstate\b/);
});
