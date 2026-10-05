const assert = require("node:assert/strict");
const test = require("node:test");
const { loadPropertyAndAccountForms, formElements } = require("./feature-test-helpers.cjs");
const vm = require("node:vm");
test("property and account form modules expose separate APIs", () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const dependencies = {
    $: formElements(), state: {}, toast() {}, closeModal() {}, fetchAll() {},
    moneyInput() {}, todayIso: () => "2026-10-05", populateFormOptions() {},
    openModal() {},
  };
  const property = context.window.PropertyDeskPropertyForm.create(dependencies);
  const account = context.window.PropertyDeskAccountForm.create({
    ...dependencies,
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
  });

  assert.deepEqual(Object.keys(property).sort(), [
    "attachEvents", "resetPropertyForm", "saveProperty",
  ]);
  assert.deepEqual(Object.keys(account).sort(), [
    "attachEvents", "editAccount", "resetAccountForm", "saveAccount", "updateLoanFields",
  ]);
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
  assert.deepEqual(
    JSON.parse(JSON.stringify(view.readValues())),
    {
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
    },
  );
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
  const $ = formElements({
    "property-name": "Rental house",
    "property-address": "10 Main St",
    "property-kind": "residential",
    "account-type": "rental",
    "account-name": "Monthly rent",
    "account-start": "2026-10-01",
    "account-frequency": "monthly",
  });
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
    fetchAll: async () => assert.fail("rejected save must not refresh"),
  };
  const property = context.window.PropertyDeskPropertyForm.create(dependencies);
  const account = context.window.PropertyDeskAccountForm.create({
    ...dependencies,
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    populateFormOptions() {},
    openModal() {},
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
  });

  await assert.doesNotReject(property.saveProperty({ preventDefault() {} }));
  await assert.doesNotReject(account.saveAccount({ preventDefault() {} }));
  assert.deepEqual(messages, [
    "Property couldn't be saved right now. Check your connection and try again.",
    "Account couldn't be saved right now. Check your connection and try again.",
  ]);
});


