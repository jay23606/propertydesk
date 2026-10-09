const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property and account forms keep separate dependencies and expose explicit actions", () => {
  const root = path.join(__dirname, "..");
  const passed = {};
  const propertyActions = {
    resetPropertyForm() {},
    attachEvents() {},
  };
  const accountActions = {
    openAccountForProperty() {},
    editAccount() {},
    attachEvents() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyForm: {
        create(options) {
          passed.property = options;
          return propertyActions;
        },
      },
      PropertyDeskAccountForm: {
        create(options) {
          passed.account = options;
          return accountActions;
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(root, "features", "property-account-forms-workflow.js"),
      "utf8",
    ),
    context,
  );

  const property = {
    $: () => {},
    getProperties: () => [],
    getWorkspaceOwnerId: () => null,
    toast: () => {},
    closeModal: () => {},
    fetchAll: () => {},
    repository: { kind: "properties" },
    saveWorkspaceRecord: () => {},
    saveAndRefreshWorkspaceRecord: () => {},
    selectRecordWriteCompletion: () => {},
    workflows: { kind: "property-form-modules" },
    unusedDependency: true,
  };
  const workflows = {
    propertyForm: context.window.PropertyDeskPropertyForm,
    accountForm: context.window.PropertyDeskAccountForm,
    propertyFormModules: property.workflows,
    accountFormModules: { kind: "account-form-modules" },
  };
  const account = {
    $: () => {},
    getAccounts: () => [],
    getWorkspaceOwnerId: () => null,
    moneyInput: () => {},
    toast: () => {},
    closeModal: () => {},
    fetchAll: () => {},
    todayIso: () => {},
    populateFormOptions: () => {},
    openModal: () => {},
    buildAccountPayload: () => {},
    formModel: {},
    previewReminderEmail: () => {},
    repository: { kind: "accounts" },
    saveWorkspaceRecord: () => {},
    saveAndRefreshWorkspaceRecord: () => {},
    selectRecordWriteCompletion: () => {},
    workflows: { kind: "account-form-modules" },
    unusedDependency: true,
  };
  workflows.accountFormModules = account.workflows;
  const forms = context.window.PropertyDeskPropertyAccountFormsWorkflow.create({
    property,
    account,
    workflows,
  });
  const source = fs.readFileSync(
    path.join(root, "features", "property-account-forms-workflow.js"),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /window\.PropertyDesk(?:Property|Account)Form\.create/,
  );
  assert.doesNotMatch(source, /writeFeedback/);
  for (const filename of [
    "account-form.js",
    "account-form-maintenance.js",
    "property-save-maintenance.js",
  ]) {
    const moduleSource = fs.readFileSync(
      path.join(root, "features", filename),
      "utf8",
    );
    assert.doesNotMatch(moduleSource, /\bstate\s*[,.=]/);
  }

  assert.deepEqual(Object.keys(passed.property).sort(), [
    "$",
    "closeModal",
    "fetchAll",
    "getProperties",
    "getWorkspaceOwnerId",
    "repository",
    "saveAndRefreshWorkspaceRecord",
    "saveWorkspaceRecord",
    "selectRecordWriteCompletion",
    "toast",
    "workflows",
  ]);
  assert.deepEqual(Object.keys(passed.account).sort(), [
    "$",
    "buildAccountPayload",
    "closeModal",
    "fetchAll",
    "formModel",
    "getAccounts",
    "getWorkspaceOwnerId",
    "moneyInput",
    "openModal",
    "populateFormOptions",
    "previewReminderEmail",
    "repository",
    "saveAndRefreshWorkspaceRecord",
    "saveWorkspaceRecord",
    "selectRecordWriteCompletion",
    "toast",
    "todayIso",
    "workflows",
  ]);
  for (const key of Object.keys(passed.property))
    assert.equal(passed.property[key], property[key]);
  for (const key of Object.keys(passed.account))
    assert.equal(passed.account[key], account[key]);
  assert.equal(passed.property.workflows, workflows.propertyFormModules);
  assert.equal(passed.account.workflows, workflows.accountFormModules);
  assert.equal("unusedDependency" in passed.property, false);
  assert.equal("unusedDependency" in passed.account, false);
  assert.deepEqual(Object.keys(forms).sort(), [
    "attachAccountFormEvents",
    "attachPropertyFormEvents",
    "editAccount",
    "openAccountForProperty",
    "resetPropertyForm",
  ]);
  assert.equal(forms.resetPropertyForm, propertyActions.resetPropertyForm);
  assert.equal(forms.attachPropertyFormEvents, propertyActions.attachEvents);
  assert.equal(
    forms.openAccountForProperty,
    accountActions.openAccountForProperty,
  );
  assert.equal(forms.editAccount, accountActions.editAccount);
  assert.equal(forms.attachAccountFormEvents, accountActions.attachEvents);
  assert.equal(Object.isFrozen(forms), true);
});

test("property/account form coordinator loads before app and is cached", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const feature = "features/property-account-forms-workflow.js";
  const setup = "features/property-account-forms-setup.js";

  assert.ok(html.indexOf("features/account-form.js") < html.indexOf(feature));
  assert.ok(html.indexOf(feature) < html.indexOf(setup));
  assert.ok(html.indexOf(setup) < html.indexOf("app.js"));
  assert.ok(worker.includes(`'./${feature}'`));
  assert.ok(worker.includes(`'./${setup}'`));
});
