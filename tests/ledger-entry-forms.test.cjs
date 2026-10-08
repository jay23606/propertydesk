const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadLedgerEntryForms,
  ledgerEntryDependencies,
  accountFormDependencies,
  accountFormModel,
  propertyFormDependencies,
  loadPropertyAndAccountForms,
  formElements,
} = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function captureFormSubmissions(getElement, formIds) {
  const handlers = new Map();
  const $ = (id) => {
    const element = getElement(id);
    if (typeof element.addEventListener !== "function")
      element.addEventListener = () => {};
    if (formIds.includes(id))
      element.addEventListener = (event, handler) => {
        if (event === "submit") handlers.set(`${id}:${event}`, handler);
      };
    return element;
  };
  return { $, handlers };
}

test("ledger entry forms publish an explicit payment and expense interface", () => {
  const calls = [];
  const passed = {};
  const transactionRepository = { insertPayment() {}, insertExpense() {} };
  const buildPaymentPayload = () => ({ payment_payload: true });
  const buildExpensePayload = () => ({ expense_payload: true });
  const buildPaymentCorrection = () => ({ payment_correction: true });
  const buildExpenseCorrection = () => ({ expense_correction: true });
  const insertPayment = () => true;
  const insertExpense = () => true;
  const paymentActions = {
    updatePaymentGuidance: () => "preview",
    openPayment: () => "open payment",
    openPropertyPayment: () => "open property payment",
    attachEvents: () => calls.push("payment events"),
  };
  const expenseActions = {
    openExpense: () => "open expense",
    attachEvents: () => calls.push("expense events"),
  };
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionRepository: transactionRepository,
      PropertyDeskRepositoryWriteFeedback: { saveWorkspaceRecord() {} },
      PropertyDeskWorkspaceRecordWriteWorkflow: {
        selectRecordWriteCompletion() {},
      },
      PropertyDeskTransactionPayloads: {
        buildPayment: buildPaymentPayload,
        buildExpense: buildExpensePayload,
        buildPaymentCorrection,
        buildExpenseCorrection,
      },
      PropertyDeskTransactionInserts: {
        create: (options) => {
          passed.persistenceOptions = options;
          return { insertPayment, insertExpense };
        },
      },
      PropertyDeskLedgerEntrySaveWorkflow: {
        create: (options) => {
          passed.saveWorkflowOptions = options;
          return { saveTransactionEntry: () => "saved" };
        },
      },
      PropertyDeskPaymentEntryForm: {
        create: (options) => {
          passed.payment = options;
          return paymentActions;
        },
      },
      PropertyDeskExpenseEntryForm: {
        create: (options) => {
          passed.expense = options;
          return expenseActions;
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-entry-forms.js"),
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
    fillSelect() {},
    populateFormOptions() {},
    prettyType() {},
    openModal() {},
    expenseAccountPolicy: {
      requiresRentalAccount: () => false,
      accountMatchesCategory: () => true,
    },
    navigate: () => {},
    previewReminderEmail: () => {},
    saveCorrection() {},
    unrelatedDependency() {},
    ...ledgerEntryDependencies(context),
  };
  const forms =
    context.window.PropertyDeskLedgerEntryForms.create(dependencies);

  assert.deepEqual(
    Object.keys(forms).sort(),
    [
      "attachLedgerEntryFormEvents",
      "openExpense",
      "openPayment",
      "openPropertyPayment",
      "updatePaymentGuidance",
    ].sort(),
  );
  assert.equal(
    forms.updatePaymentGuidance,
    paymentActions.updatePaymentGuidance,
  );
  assert.equal(forms.openExpense, expenseActions.openExpense);
  assert.deepEqual(
    Object.keys(passed.payment).sort(),
    [
      "$",
      "buildPaymentPayload",
      "buildPaymentCorrection",
      "fillSelect",
      "insertPayment",
      "moneyInput",
      "openModal",
      "populateFormOptions",
      "prettyType",
      "saveTransactionEntry",
      "state",
      "todayIso",
      "toast",
      "workflows",
    ].sort(),
  );
  assert.deepEqual(
    Object.keys(passed.expense).sort(),
    [
      "$",
      "buildExpensePayload",
      "buildExpenseCorrection",
      "fillSelect",
      "expenseAccountPolicy",
      "insertExpense",
      "moneyInput",
      "openModal",
      "populateFormOptions",
      "prettyType",
      "saveTransactionEntry",
      "state",
      "todayIso",
      "toast",
      "workflows",
    ].sort(),
  );
  assert.equal(
    passed.payment.saveTransactionEntry,
    passed.expense.saveTransactionEntry,
  );
  assert.equal(passed.payment.buildPaymentPayload, buildPaymentPayload);
  assert.equal(passed.expense.buildExpensePayload, buildExpensePayload);
  assert.equal(passed.payment.buildPaymentCorrection, buildPaymentCorrection);
  assert.equal(passed.expense.buildExpenseCorrection, buildExpenseCorrection);
  assert.equal(passed.payment.insertPayment, insertPayment);
  assert.equal(passed.expense.insertExpense, insertExpense);
  assert.equal(
    passed.payment.workflows.view,
    dependencies.workflows.paymentView,
  );
  assert.equal(
    passed.payment.workflows.propertyPaymentAction,
    dependencies.workflows.propertyPaymentAction,
  );
  assert.equal(
    passed.expense.workflows.view,
    dependencies.workflows.expenseView,
  );
  assert.equal(passed.persistenceOptions.toast, dependencies.toast);
  assert.equal(passed.persistenceOptions.repository, transactionRepository);
  assert.equal(
    passed.persistenceOptions.writeFeedback,
    dependencies.writeFeedback,
  );
  assert.equal(
    passed.persistenceOptions.selectRecordWriteCompletion,
    dependencies.selectRecordWriteCompletion,
  );
  assert.equal(passed.saveWorkflowOptions.closeModal, dependencies.closeModal);
  assert.equal(passed.saveWorkflowOptions.fetchAll, undefined);
  assert.equal(passed.saveWorkflowOptions.state, dependencies.state);
  assert.equal(
    passed.saveWorkflowOptions.saveCorrection,
    dependencies.saveCorrection,
  );
  forms.attachLedgerEntryFormEvents();
  assert.deepEqual(calls, ["payment events", "expense events"]);
});

test("shared ledger save resets, refreshes, then continues or closes", async () => {
  const calls = [];
  let failRefresh = false;
  const context = vm.createContext({
    window: {
      PropertyDeskRepositoryWriteFeedback: {},
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-write-reconciliation.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-record-write-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-write-feedback.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-entry-save-workflow.js"),
      "utf8",
    ),
    context,
  );
  const workflow = context.window.PropertyDeskLedgerEntrySaveWorkflow.create({
    $: (id) => id,
    state: { pendingCorrection: null },
    saveCorrection() {},
    closeModal: (id) => calls.push(`close:${id}`),
    fetchAll: async () => {
      calls.push("refresh");
      if (failRefresh) throw new Error("refresh failed");
    },
    toast: (message) => calls.push(`toast:${message}`),
  });
  assert.deepEqual(Object.keys(workflow), ["saveTransactionEntry"]);
  async function insertAndComplete({ completion }) {
    completion.onSaved();
    calls.push("refresh");
    if (failRefresh) {
      calls.push(`toast:${completion.savedRefreshFailureMessage}`);
      return false;
    }
    completion.afterRefresh();
    calls.push(`toast:${completion.successMessage}`);
    return true;
  }

  await workflow.saveTransactionEntry({
    kind: "payment",
    event: { submitter: { id: "payment-save-button" } },
    payload: {},
    buildCorrection: () => ({}),
    insert: insertAndComplete,
    failureMessage: "Payment unavailable",
    label: "Payment",
    modalId: "payment-modal",
    resetAfterSave: () => calls.push("reset-payment:account-1"),
  });
  await workflow.saveTransactionEntry({
    kind: "expense",
    event: { submitter: { id: "expense-save-next" } },
    payload: {},
    buildCorrection: () => ({}),
    insert: insertAndComplete,
    failureMessage: "Expense unavailable",
    label: "Expense",
    modalId: "expense-modal",
    resetAfterSave: () => calls.push("reset-expense"),
    prepareNext: () => calls.push("next-expense:property-1"),
  });

  assert.deepEqual(calls, [
    "reset-payment:account-1",
    "refresh",
    "close:payment-modal",
    "toast:Payment recorded",
    "reset-expense",
    "refresh",
    "next-expense:property-1",
    "toast:Expense recorded. Ready for the next entry",
  ]);
  failRefresh = true;
  await workflow.saveTransactionEntry({
    kind: "payment",
    event: { submitter: { id: "payment-save-button" } },
    payload: {},
    buildCorrection: () => ({}),
    insert: insertAndComplete,
    failureMessage: "Payment unavailable",
    label: "Payment",
    modalId: "payment-modal",
    resetAfterSave: () => calls.push("reset-payment:account-2"),
  });
  assert.deepEqual(calls.slice(-3), [
    "reset-payment:account-2",
    "refresh",
    "toast:Payment was saved, but the workspace could not refresh. Reload before recording it again.",
  ]);
});

test("property/account forms and ledger-entry forms expose separate workflows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "create-actions.js"),
      "utf8",
    ),
    context,
  );
  loadPropertyAndAccountForms(context);
  loadLedgerEntryForms(context);
  const formContext = {
    $: formElements(),
    state: {},
    toast() {},
    closeModal() {},
    fetchAll() {},
    navigate: () => {},
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    populateFormOptions() {},
    openModal() {},
  };
  const property = context.window.PropertyDeskPropertyForm.create({
    ...formContext,
    ...propertyFormDependencies(context),
  });
  const account = context.window.PropertyDeskAccountForm.create({
    ...formContext,
    previewReminderEmail: () => {},
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: accountFormModel(context),
    ...accountFormDependencies(context),
  });
  const ledger = context.window.PropertyDeskLedgerEntryForms.create({
    ...ledgerEntryDependencies(context),
  });
  assert.equal(Object.isFrozen(property), true);
  assert.equal(Object.isFrozen(account), true);
  assert.equal(Object.isFrozen(ledger), true);
  const actions = context.window.PropertyDeskCreateActions.create({});
  for (const [feature, names] of [
    [property, ["resetPropertyForm", "attachEvents"]],
    [account, ["openAccountForProperty", "editAccount", "attachEvents"]],
    [
      ledger,
      [
        "openPayment",
        "openPropertyPayment",
        "openExpense",
        "attachLedgerEntryFormEvents",
      ],
    ],
    [actions, ["attachCreateActionEvents"]],
  ]) {
    for (const name of names)
      assert.equal(typeof feature[name], "function", name);
  }
});

test("payment and expense form workflows publish explicit view operations", () => {
  const context = vm.createContext({ window: {} });
  loadLedgerEntryForms(context);
  const viewDependencies = {};
  context.window.PropertyDeskPaymentEntryView = {
    create: (options) => {
      viewDependencies.payment = options;
      return {
        updatePaymentGuidance() {},
        readValues() {},
        resetAfterSave() {},
        prepareNextPayment() {},
        openPayment() {},
        openPropertyPayment() {},
        attachEvents() {},
      };
    },
  };
  context.window.PropertyDeskExpenseEntryView = {
    create: (options) => {
      viewDependencies.expense = options;
      return {
        openExpense() {},
        prepareNextExpense() {},
        readValues() {},
        resetAfterSave() {},
        attachEvents() {},
      };
    },
  };
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        addEventListener() {},
      });
    }
    return elements.get(id);
  };
  const dependencies = {
    $,
    state: { accounts: [] },
    toast() {},
    closeModal() {},
    fetchAll() {},
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    fillSelect() {},
    populateFormOptions() {},
    prettyType: String,
    openModal() {},
    expenseAccountPolicy: {
      requiresRentalAccount: () => false,
      accountMatchesCategory: () => true,
    },
    workflows: {
      paymentView: context.window.PropertyDeskPaymentEntryView,
      expenseView: context.window.PropertyDeskExpenseEntryView,
      propertyPaymentAction: context.window.PropertyDeskPropertyPaymentAction,
    },
    saveCorrection() {},
    buildPaymentPayload() {},
    buildExpensePayload() {},
  };
  const payment = context.window.PropertyDeskPaymentEntryForm.create({
    ...dependencies,
    workflows: {
      view: context.window.PropertyDeskPaymentEntryView,
      propertyPaymentAction: context.window.PropertyDeskPropertyPaymentAction,
    },
  });
  const expense = context.window.PropertyDeskExpenseEntryForm.create({
    ...dependencies,
    workflows: { view: context.window.PropertyDeskExpenseEntryView },
  });

  assert.equal(Object.isFrozen(payment), true);
  assert.equal(Object.isFrozen(expense), true);
  assert.deepEqual(Object.keys(viewDependencies.payment).sort(), [
    "$",
    "fillSelect",
    "moneyInput",
    "openModal",
    "populateFormOptions",
    "prettyType",
    "state",
    "todayIso",
  ]);
  assert.deepEqual(Object.keys(viewDependencies.expense).sort(), [
    "$",
    "expenseAccountPolicy",
    "fillSelect",
    "moneyInput",
    "openModal",
    "populateFormOptions",
    "prettyType",
    "state",
    "todayIso",
  ]);

  assert.deepEqual(Object.keys(payment).sort(), [
    "attachEvents",
    "openPayment",
    "openPropertyPayment",
    "updatePaymentGuidance",
  ]);
  assert.deepEqual(Object.keys(expense).sort(), [
    "attachEvents",
    "openExpense",
  ]);
});

test("payment and expense callbacks retain values at their form boundary", async () => {
  const context = vm.createContext({ window: {} });
  loadLedgerEntryForms(context);
  const calls = [];
  const submitHandlers = new Map();
  const paymentValues = {
    accountId: "rental-1",
    amount: 500,
    receivedDate: "2026-10-05",
    paymentMethod: "check",
    incomeCategory: "rent",
    memo: "October",
  };
  const expenseValues = {
    propertyId: "property-1",
    accountId: "rental-1",
    amount: 100,
    expenseDate: "2026-10-06",
    category: "repair",
    payee: "Plumber",
    paymentMethod: "check",
    memo: "Leak repair",
  };
  context.window.PropertyDeskPaymentEntryView = {
    create: () => ({
      readValues: () => paymentValues,
      resetAfterSave: (accountId) => calls.push(["reset-payment", accountId]),
      prepareNextPayment: () => calls.push(["next-payment"]),
      openPayment() {},
      openPropertyPayment() {},
      updatePaymentGuidance() {},
      attachEvents() {},
    }),
  };
  context.window.PropertyDeskPropertyPaymentAction = {
    create: () => ({ openPropertyPayment() {} }),
  };
  context.window.PropertyDeskExpenseEntryView = {
    create: () => ({
      readValues: () => expenseValues,
      resetAfterSave: () => calls.push(["reset-expense"]),
      prepareNextExpense: (values) => calls.push(["next-expense", values]),
      openExpense() {},
      attachEvents() {},
    }),
  };

  const common = {
    $: (id) => ({
      addEventListener: (event, handler) => {
        if (event === "submit") submitHandlers.set(id, handler);
      },
    }),
    state: {
      workspaceOwnerId: "workspace-1",
      accounts: [
        { id: "rental-1", property_id: "property-1", account_type: "rental" },
      ],
    },
    toast() {},
    saveTransactionEntry: async (options) => {
      options.resetAfterSave();
      options.prepareNext?.();
    },
    insertPayment() {},
    insertExpense() {},
    buildPaymentPayload: (values) => values,
    buildPaymentCorrection: (values) => values,
    buildExpensePayload: (values) => values,
    buildExpenseCorrection: (values) => values,
    moneyInput: Number,
    todayIso: () => "2026-10-08",
    fillSelect() {},
    populateFormOptions() {},
    prettyType: String,
    openModal() {},
    expenseAccountPolicy: {
      requiresRentalAccount: () => false,
      accountMatchesCategory: () => true,
    },
    workflows: {
      view: context.window.PropertyDeskPaymentEntryView,
      propertyPaymentAction: context.window.PropertyDeskPropertyPaymentAction,
    },
  };
  const payment = context.window.PropertyDeskPaymentEntryForm.create(common);
  const expense = context.window.PropertyDeskExpenseEntryForm.create({
    ...common,
    workflows: { view: context.window.PropertyDeskExpenseEntryView },
  });
  payment.attachEvents();
  expense.attachEvents();

  for (const [formId, submitterId] of [
    ["payment-form", "payment-save-next"],
    ["expense-form", "expense-save-next"],
  ]) {
    await submitHandlers.get(formId)({
      preventDefault() {},
      submitter: { id: submitterId },
    });
  }

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["reset-payment", "rental-1"],
    ["next-payment"],
    ["reset-expense"],
    [
      "next-expense",
      {
        propertyId: "property-1",
        accountId: "rental-1",
        category: "repair",
        payee: "Plumber",
        paymentMethod: "check",
      },
    ],
  ]);
});

test("payment and expense forms report rejected saves without clearing the entries", async () => {
  const context = vm.createContext({ window: {}, Event });
  loadLedgerEntryForms(context);
  const messages = [];
  const values = {
    "payment-account": "rental-1",
    "payment-amount": "500",
    "payment-date": "2026-10-05",
    "payment-method": "check",
    "payment-memo": "October",
    "income-category": "rent",
    "expense-property": "property-1",
    "expense-category": "repair",
    "expense-amount": "100",
    "expense-date": "2026-10-05",
    "expense-method": "check",
    "expense-memo": "Plumbing repair",
  };
  const { $, handlers } = captureFormSubmissions(formElements(values), [
    "payment-form",
    "expense-form",
  ]);
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [
      { id: "rental-1", property_id: "property-1", account_type: "rental" },
    ],
    pendingCorrection: null,
    client: {
      from: () => ({
        insert: async () => {
          throw new Error("offline");
        },
      }),
      rpc: async () => {
        throw new Error("offline");
      },
    },
  };
  const corrections = [];
  const forms = context.window.PropertyDeskLedgerEntryForms.create({
    $,
    state,
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    toast: (message) => messages.push(message),
    closeModal: () => assert.fail("rejected save must keep its form open"),
    fetchAll: async () => assert.fail("rejected save must not refresh"),
    fillSelect() {},
    populateFormOptions() {},
    prettyType: (type) => type,
    openModal() {},
    saveCorrection: (...args) => corrections.push(args),
    ...ledgerEntryDependencies(context),
  });

  forms.attachLedgerEntryFormEvents();
  await assert.doesNotReject(
    handlers.get("payment-form:submit")({ preventDefault() {} }),
  );
  await assert.doesNotReject(
    handlers.get("expense-form:submit")({ preventDefault() {} }),
  );
  state.pendingCorrection = { kind: "payment", id: "payment-1", reason: "fix" };
  await assert.doesNotReject(
    handlers.get("payment-form:submit")({ preventDefault() {} }),
  );
  state.pendingCorrection = { kind: "expense", id: "expense-1", reason: "fix" };
  await assert.doesNotReject(
    handlers.get("expense-form:submit")({ preventDefault() {} }),
  );
  assert.deepEqual(messages, [
    "Payment result couldn't be confirmed. Reload the Properties or Transactions list before recording it again.",
    "Expense result couldn't be confirmed. Reload the Transactions list before recording it again.",
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(corrections)), [
    [
      "payment",
      {
        account_id: "rental-1",
        amount: 500,
        received_date: "2026-10-05",
        payment_method: "check",
        income_category: "rent",
        principal_amount: 0,
        interest_amount: 0,
        fee_amount: 0,
        escrow_amount: 0,
        unapplied_amount: 0,
        memo: "October",
      },
    ],
    [
      "expense",
      {
        property_id: "property-1",
        account_id: null,
        amount: 100,
        expense_date: "2026-10-05",
        category: "repair",
        payee: null,
        payment_method: "check",
        memo: "Plumbing repair",
      },
    ],
  ]);
});
