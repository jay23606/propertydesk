const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property/account entry workflow keeps their repositories and actions scoped", () => {
  const passed = {};
  const resetPropertyForm = () => {};
  const editAccount = () => {};
  const openAccountForProperty = () => {};
  const attachPropertyFormEvents = () => {};
  const attachAccountFormEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyForm: {
        create(options) {
          passed.property = options;
          return { resetPropertyForm, attachEvents: attachPropertyFormEvents };
        },
      },
      PropertyDeskAccountForm: {
        create(options) {
          passed.account = options;
          return {
            editAccount,
            openAccountForProperty,
            attachEvents: attachAccountFormEvents,
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
        "property-account-entry-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const dependencies = {
    $() {},
    state: {},
    moneyInput() {},
    todayIso() {},
    toast() {},
    closeModal() {},
    fetchAll() {},
    populateFormOptions() {},
    openModal() {},
    previewReminderEmail() {},
    propertyRepository: { kind: "property" },
    accountRepository: { kind: "account" },
    accountPayload() {},
    accountFormModel: {},
  };
  const workflow =
    context.window.PropertyDeskPropertyAccountEntryWorkflow.create(
      dependencies,
    );

  assert.equal(passed.property.repository, dependencies.propertyRepository);
  assert.equal(passed.account.repository, dependencies.accountRepository);
  assert.equal(passed.account.buildAccountPayload, dependencies.accountPayload);
  assert.equal(passed.account.formModel, dependencies.accountFormModel);
  assert.equal(workflow.resetPropertyForm, resetPropertyForm);
  assert.equal(workflow.editAccount, editAccount);
  assert.equal(workflow.openAccountForProperty, openAccountForProperty);
  assert.equal(workflow.attachPropertyFormEvents, attachPropertyFormEvents);
  assert.equal(workflow.attachAccountFormEvents, attachAccountFormEvents);
});
