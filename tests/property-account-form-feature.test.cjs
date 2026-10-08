const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadPropertyAndAccountForms,
  accountFormDependencies,
  propertyFormDependencies,
  formElements,
} = require("./feature-test-helpers.cjs");
const vm = require("node:vm");
test("property and account form modules expose separate APIs", () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const dependencies = {
    $: formElements(),
    state: {},
    toast() {},
    closeModal() {},
    fetchAll() {},
    moneyInput() {},
    todayIso: () => "2026-10-05",
    populateFormOptions() {},
    openModal() {},
  };
  const property = context.window.PropertyDeskPropertyForm.create({
    ...dependencies,
    ...propertyFormDependencies(context, dependencies.state),
  });
  let accountViewDependencies;
  context.window.PropertyDeskAccountFormView = {
    create: (viewDependencies) => {
      accountViewDependencies = viewDependencies;
      return {
        resetAccountForm() {},
        readValues() {},
        editAccount() {},
        attachEvents() {},
      };
    },
  };
  const account = context.window.PropertyDeskAccountForm.create({
    ...dependencies,
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
    ...accountFormDependencies(context, dependencies.state),
  });

  assert.equal(Object.isFrozen(property), true);
  assert.equal(Object.isFrozen(account), true);
  assert.deepEqual(Object.keys(accountViewDependencies).sort(), [
    "$",
    "openModal",
    "populateFormOptions",
    "todayIso",
  ]);

  assert.deepEqual(Object.keys(property).sort(), [
    "attachEvents",
    "resetPropertyForm",
  ]);
  assert.deepEqual(Object.keys(account).sort(), [
    "attachEvents",
    "editAccount",
    "openAccountForProperty",
  ]);
});

test("property and account maintenance save inserts and updates to their own tables", async () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const writes = [];
  const state = {
    client: {
      from(table) {
        return {
          insert(payload) {
            writes.push({ operation: "insert", table, payload });
            return Promise.resolve({ error: null });
          },
          update(payload) {
            return {
              async eq(column, value) {
                writes.push({
                  operation: "update",
                  table,
                  payload,
                  column,
                  value,
                });
                return { error: null };
              },
            };
          },
        };
      },
    },
  };
  const messages = [];
  const property = context.window.PropertyDeskPropertyMaintenance.create({
    toast: (message) => messages.push(message),
    repository: context.window.PropertyDeskPropertyRepository.create({
      getClient: () => state.client,
    }),
  });
  assert.equal(Object.isFrozen(property), true);
  assert.deepEqual(Object.keys(property), [
    "saveProperty",
    "savePropertyQuickNote",
    "savePropertyArchive",
  ]);
  const account = context.window.PropertyDeskAccountFormMaintenance.create({
    toast: (message) => messages.push(message),
    repository: context.window.PropertyDeskAccountRepository.create({
      getClient: () => state.client,
    }),
  });
  assert.equal(Object.isFrozen(account), true);
  assert.deepEqual(Object.keys(account), ["saveAccount"]);

  assert.equal(
    await property.saveProperty({ user_id: "workspace-1", name: "Home" }),
    true,
  );
  assert.equal(
    await property.saveProperty(
      { user_id: "workspace-1", name: "Updated" },
      "property-1",
    ),
    true,
  );
  assert.equal(
    await account.saveAccount({ user_id: "workspace-1", name: "Note" }),
    true,
  );
  assert.equal(
    await account.saveAccount(
      { user_id: "workspace-1", name: "Updated note" },
      "account-1",
    ),
    true,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(writes)), [
    {
      operation: "insert",
      table: "pd_properties",
      payload: { user_id: "workspace-1", name: "Home" },
    },
    {
      operation: "update",
      table: "pd_properties",
      payload: { user_id: "workspace-1", name: "Updated" },
      column: "id",
      value: "property-1",
    },
    {
      operation: "insert",
      table: "pd_accounts",
      payload: { user_id: "workspace-1", name: "Note" },
    },
    {
      operation: "update",
      table: "pd_accounts",
      payload: { user_id: "workspace-1", name: "Updated note" },
      column: "id",
      value: "account-1",
    },
  ]);
  assert.deepEqual(messages, []);
});

test("account form confirms a lost save response from refreshed account data", async () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const payload = {
    user_id: "workspace-1",
    name: "Rental",
    payment_amount: 825,
    account_type: "rental",
  };
  const state = { accounts: [] };
  let refreshes = 0;
  const messages = [];
  const maintenance = context.window.PropertyDeskAccountFormMaintenance.create({
    state,
    fetchAll: async () => {
      state.accounts.push({ ...payload, id: "account-1" });
      refreshes += 1;
    },
    toast: (message) => messages.push(message),
    repository: {
      save: async () => {
        throw new Error("connection lost");
      },
    },
  });

  assert.equal(await maintenance.saveAccount(payload), true);
  assert.equal(refreshes, 1);
  assert.deepEqual(messages, []);
});

test("property form view reads normalized values, resets the form, and binds submit", () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const elements = formElements({
    "property-id": "property-1",
    "property-name": "  House  ",
    "property-address": "  10 Main St  ",
    "property-city": "  Altoona  ",
    "property-state": " pa ",
    "property-zip": " 16601 ",
    "property-kind": "residential",
    "property-notes": "  Notes  ",
  });
  const handlers = new Map();
  elements("property-form").addEventListener = (event, handler) =>
    handlers.set(event, handler);
  const view = context.window.PropertyDeskPropertyFormView.create({
    $: elements,
  });

  assert.equal(Object.isFrozen(view), true);
  assert.deepEqual(JSON.parse(JSON.stringify(view.readValues())), {
    id: "property-1",
    name: "House",
    address: "10 Main St",
    city: "Altoona",
    state: "PA",
    postal_code: "16601",
    property_kind: "residential",
    notes: "Notes",
  });
  const save = () => {};
  view.attachEvents(save);
  assert.equal(handlers.get("submit"), save);

  view.resetPropertyForm();
  assert.equal(elements("property-id").value, "");
  assert.equal(elements("property-modal-title").textContent, "Add property");
});

test("account form view resets and populates fields without owning persistence", () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const elements = formElements({ "account-type": "rental" });
  const toggles = [];
  const opened = [];
  elements("loan-fields").classList.toggle = (...args) => toggles.push(args);
  const view = context.window.PropertyDeskAccountFormView.create({
    $: elements,
    todayIso: () => "2026-10-05",
    populateFormOptions: () => opened.push("options"),
    openModal: (id) => opened.push(id),
  });

  assert.equal(Object.isFrozen(view), true);
  assert.deepEqual(Object.keys(view).sort(), [
    "attachEvents",
    "editAccount",
    "readValues",
    "resetAccountForm",
  ]);
  view.editAccount({
    id: "account-1",
    account_type: "note",
    property_id: "property-1",
    name: "Seller note",
    party_name: "Buyer",
    party_email: "buyer@example.com",
    party_phone: "555-0100",
    monthly_reminder_enabled: false,
    start_date: "2024-01-01",
    next_due_date: "2026-11-01",
    payment_amount: 550,
    payment_frequency: "monthly",
    original_principal: 40000,
    principal_interest_amount: 400,
    escrow_amount: 150,
    balance_adjustment: 100,
    agreement_effective_date: "2025-06-01",
    interest_rate: 5,
    term_months: 360,
    balloon_date: "",
    late_fee: 25,
    grace_days: 5,
    notes: "Current agreement",
  });

  assert.equal(elements("account-modal-title").textContent, "Edit account");
  assert.equal(elements("account-party-phone").value, "555-0100");
  assert.equal(elements("account-escrow").value, 150);
  assert.equal(elements("account-term").value, 360);
  assert.deepEqual(JSON.parse(JSON.stringify(view.readValues())), {
    id: "account-1",
    type: "note",
    propertyId: "property-1",
    name: "Seller note",
    partyName: "Buyer",
    partyEmail: "buyer@example.com",
    partyPhone: "555-0100",
    reminderEnabled: false,
    startDate: "2024-01-01",
    nextDueDate: "2026-11-01",
    paymentAmount: 550,
    paymentFrequency: "monthly",
    originalPrincipal: 40000,
    principalInterestAmount: 400,
    escrowAmount: 150,
    balanceAdjustment: 100,
    interestRate: 5,
    termMonths: 360,
    balloonDate: "",
    agreementEffectiveDate: "2025-06-01",
    agreementChangeReason: "",
    lateFee: 25,
    graceDays: 5,
    notes: "Current agreement",
  });
  assert.deepEqual(opened, ["options", "account-modal"]);
  assert.deepEqual(toggles.at(-1), ["hidden", false]);

  elements("account-type").value = "rental";
  view.resetAccountForm();
  assert.equal(elements("account-id").value, "");
  assert.equal(elements("account-start").value, "2026-10-05");
  assert.equal(elements("account-reminder-enabled").checked, false);
  assert.deepEqual(toggles.at(-1), ["hidden", true]);
});

test("property and account forms report rejected saves without running success actions", async () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const messages = [];
  const elements = formElements({
    "property-name": "Rental house",
    "property-address": "10 Main St",
    "property-kind": "residential",
    "account-type": "rental",
    "account-name": "Monthly rent",
    "account-start": "2026-10-01",
    "account-frequency": "monthly",
  });
  const handlers = new Map();
  const $ = (id) => {
    const element = elements(id);
    if (id === "property-form" || id === "account-form")
      element.addEventListener = (event, handler) => {
        handlers.set(`${id}:${event}`, handler);
      };
    return element;
  };
  const state = {
    workspaceOwnerId: "workspace-1",
    client: {
      from: () => ({
        insert: async () => {
          throw new Error("offline");
        },
      }),
    },
  };
  const dependencies = {
    $,
    state,
    toast: (message) => messages.push(message),
    closeModal: () => assert.fail("rejected save must keep its form open"),
    fetchAll: async () => {
      throw new Error("offline");
    },
  };
  const property = context.window.PropertyDeskPropertyForm.create({
    ...dependencies,
    ...propertyFormDependencies(context, state),
  });
  const account = context.window.PropertyDeskAccountForm.create({
    ...dependencies,
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    populateFormOptions() {},
    openModal() {},
    previewReminderEmail: () => {},
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
    ...accountFormDependencies(context, state),
  });

  property.attachEvents();
  account.attachEvents();
  await assert.doesNotReject(
    handlers.get("property-form:submit")({ preventDefault() {} }),
  );
  await assert.doesNotReject(
    handlers.get("account-form:submit")({ preventDefault() {} }),
  );
  assert.deepEqual(messages, [
    "Property save result couldn't be confirmed. Reload Properties before trying again.",
    "Account save result couldn't be confirmed, and Properties could not refresh. Reload before trying again.",
  ]);
});
