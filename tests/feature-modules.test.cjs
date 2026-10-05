const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

test("CSV import feature loads as an isolated browser module", () => {
  const validators = Object.freeze({ validateAccountRows() {} });
  const context = vm.createContext({
    window: { PropertyDeskImportWorkflows: validators },
  });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "imports.js"),
    "utf8",
  );

  vm.runInContext(source, context);

  assert.equal(context.window.PropertyDeskImportWorkflows, validators);
  const feature = context.window.PropertyDeskImportFeature.create({});
  assert.equal(typeof feature.attachEvents, "function");
  assert.equal(typeof feature.importAccounts, "function");
  assert.equal(typeof feature.importExpenses, "function");
  assert.equal(typeof feature.importPayments, "function");
});

test("property and account detail views expose focused render actions", () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "details.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const feature = context.window.PropertyDeskDetailViews.create({});
  assert.equal(typeof feature.openPropertyDetails, "function");
  assert.equal(typeof feature.openAccountDetails, "function");
});

test("app coordinator passes the amortization helper into account details", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /amortizationSchedule,[\s\S]*?\} = window\.PropertyDeskLedgerUtils;/,
  );
  assert.match(
    app,
    /PropertyDeskDetailViews\.create\(\{[\s\S]*?amortizationSchedule,/,
  );
  assert.match(
    app,
    /correctTransaction,[\s\S]*?=\s*window\.PropertyDeskLedgerActions\.create/,
  );
  assert.match(
    app,
    /PropertyDeskLedgerActions\.create\(\{[\s\S]*?updateAllocationPreview/,
  );
});

test("service worker caches a cloned shell response within the fetch lifetime", async () => {
  let fetchHandler;
  let eventDispatchFinished = false;
  let waitUntilPromise;
  let responsePromise;
  let cachedBody = "";
  let cachedKey;
  const self = {
    registration: { scope: "https://propertydesk.test/" },
    location: { origin: "https://propertydesk.test" },
    addEventListener(type, handler) {
      if (type === "fetch") fetchHandler = handler;
    },
  };
  const caches = {
    async open() {
      return {
        async put(key, response) {
          cachedKey = key.url || key;
          cachedBody = await response.text();
        },
      };
    },
    async match() {
      return null;
    },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    Response,
    fetch: async () => new Response("shell asset"),
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"),
    context,
  );

  fetchHandler({
    request: {
      method: "GET",
      mode: "cors",
      url: "https://propertydesk.test/app.js",
    },
    waitUntil(promise) {
      assert.equal(
        eventDispatchFinished,
        false,
        "waitUntil must be called during fetch dispatch",
      );
      waitUntilPromise = promise;
    },
    respondWith(promise) {
      responsePromise = promise;
    },
  });
  eventDispatchFinished = true;

  const response = await responsePromise;
  await waitUntilPromise;
  assert.equal(await response.text(), "shell asset");
  assert.equal(cachedBody, "shell asset");
  assert.equal(cachedKey, "https://propertydesk.test/app.js");
});

test("service worker falls back to the cached app shell for offline navigation", async () => {
  let fetchHandler;
  let responsePromise;
  let matchedKey;
  const self = {
    registration: { scope: "https://propertydesk.test/" },
    location: { origin: "https://propertydesk.test" },
    addEventListener(type, handler) {
      if (type === "fetch") fetchHandler = handler;
    },
  };
  const caches = {
    async open() {
      return { async put() {} };
    },
    async match(key) {
      matchedKey = key;
      return new Response("cached offline app shell");
    },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    Response,
    fetch: async () => {
      throw new Error("offline");
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"),
    context,
  );

  fetchHandler({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://propertydesk.test/",
    },
    respondWith(promise) {
      responsePromise = promise;
    },
  });

  const response = await responsePromise;
  assert.equal(matchedKey, "./index.html");
  assert.equal(await response.text(), "cached offline app shell");
});

test("Properties grid totals the visible due, monthly payments, and loan balances", () => {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === "property-filter" ? "all" : "",
        checked: false,
        innerHTML: "",
        textContent: "",
        classList: { toggle() {} },
      });
    }
    return elements.get(id);
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-views.js"),
      "utf8",
    ),
    context,
  );
  const feature = context.window.PropertyDeskPropertyViews.create({
    $: getElement,
    state: {
      properties: [{ id: "property-1", name: "One Oak", address: "1 Oak St" }],
      accounts: [
        {
          id: "account-1",
          property_id: "property-1",
          status: "active",
          account_type: "land_contract",
          payment_amount: 125,
          payment_frequency: "monthly",
          name: "Contract",
          party_name: "Buyer",
        },
        {
          id: "account-2",
          property_id: "property-1",
          status: "active",
          account_type: "rental",
          payment_amount: 200,
          payment_frequency: "monthly",
          name: "Rental",
          party_name: "Tenant",
        },
      ],
      payments: [],
      propertyHolders: [],
      workspaceMembers: [],
      user: null,
    },
    monthlyScheduledEstimate: (accounts) =>
      accounts.reduce((sum, account) => sum + account.payment_amount, 0),
    accountBalance: (account) => (account.id === "account-1" ? 1000 : 0),
    amountDueSince: (accounts) => (accounts[0].id === "account-1" ? 50 : 80),
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-04",
    esc: (value) => String(value ?? ""),
    prettyKind: (value) => value,
    money: (value) => `$${Number(value).toFixed(2)}`,
    propertyAddress: (property) => property.address,
    collectedSince: () => 0,
    scheduledMonthlyRunRate: () => 0,
    monthStart: () => "2026-10-01",
    isPosted: () => true,
    prettyType: (value) => value,
    fmtDate: () => "",
    streetAddress: (property) => property.address,
    dateOnly: (value) => new Date(`${value}T12:00:00`),
    monthEnd: () => "2026-10-31",
    lateReminderMailto: () => "mailto:buyer@example.com",
    paymentFrequencyLabel: () => "Monthly",
    paymentStatusInMonth: () => "none",
  });

  feature.renderProperties();

  const totals = getElement("accounts-totals");
  assert.match(totals.innerHTML, /\$130\.00/);
  assert.match(totals.innerHTML, /\$325\.00/);
  assert.match(totals.innerHTML, /\$1000\.00/);

  getElement("property-filter").value = "rental";
  feature.renderProperties();
  assert.match(totals.innerHTML, /\$80\.00/);
  assert.match(totals.innerHTML, /\$200\.00/);
  assert.ok(totals.innerHTML.includes("—"));
});

test("record-entry module exposes property, account, and transaction workflows", () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "record-forms.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const feature = context.window.PropertyDeskRecordForms.create({});
  for (const action of [
    "resetPropertyForm",
    "resetAccountForm",
    "saveProperty",
    "saveAccount",
    "savePayment",
    "saveExpense",
    "editAccount",
    "openPayment",
    "prefillPaymentAmount",
    "openPropertyPayment",
    "openExpense",
  ]) {
    assert.equal(typeof feature[action], "function", action);
  }
});

test("opening a payment for an account prefills its scheduled installment without overwriting typed amount", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "record-forms.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map([
    ["payment-account", { value: "" }],
    ["payment-amount", { value: "" }],
    ["payment-date", { value: "" }],
    [
      "payment-form",
      {
        reset() {
          elements.get("payment-account").value = "";
          elements.get("payment-amount").value = "";
        },
      },
    ],
    ["payment-modal", { querySelector: () => ({ textContent: "" }) }],
    ["payment-modal-title", { textContent: "" }],
    ["payment-save-button", { textContent: "" }],
    ["payment-save-next", { classList: { remove() {} } }],
    ["allocation-preview", { innerHTML: "" }],
    ["income-category-wrap", { classList: { toggle() {} } }],
  ]);
  elements.get("payment-account").value = "account-1";
  const feature = context.window.PropertyDeskRecordForms.create({
    $: (id) => elements.get(id),
    state: {
      accounts: [
        { id: "account-1", payment_amount: 647, account_type: "rental" },
      ],
      pendingCorrection: null,
    },
    moneyInput: Number,
    populateFormOptions() {},
    fillSelect() {},
    prettyType: (value) => value,
    todayIso: () => "2026-10-04",
    openModal() {},
  });

  feature.openPayment("account-1");
  assert.equal(elements.get("payment-amount").value, 647);
  elements.get("payment-amount").value = "300";
  assert.equal(feature.prefillPaymentAmount(), false);
  assert.equal(elements.get("payment-amount").value, "300");
});

test("private document module exposes upload, delete, and open workflows", () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "documents.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const feature = context.window.PropertyDeskDocuments.create({});
  for (const action of [
    "uploadPropertyDocument",
    "deletePropertyDocument",
    "openPropertyDocument",
  ]) {
    assert.equal(typeof feature[action], "function", action);
  }
});

test("document upload stores objects privately and removes an orphan after metadata failure", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "documents.js"),
      "utf8",
    ),
    context,
  );
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    client: {
      storage: {
        from(bucket) {
          assert.equal(bucket, "pd-private-agreements");
          return {
            async upload(path, file, options) {
              state.upload = { path, file, options };
              return { error: null };
            },
            async remove(paths) {
              state.removed = paths;
              return { error: null };
            },
          };
        },
      },
      from(table) {
        assert.equal(table, "pd_documents");
        return {
          async insert(row) {
            state.document = row;
            return { error: { message: "metadata insert failed" } };
          },
        };
      },
    },
  };
  const messages = [];
  const input = {
    files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
    value: "selected",
  };
  const feature = context.window.PropertyDeskDocuments.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("failed metadata must not refresh"),
    openPropertyDetails: () =>
      assert.fail("failed metadata must not reopen details"),
    makeId: () => "file-id",
  });

  await feature.uploadPropertyDocument(input);

  assert.equal(input.value, "");
  assert.equal(
    state.upload.path,
    "workspace-1/property-1/file-id-Agreement.pdf",
  );
  assert.equal(state.upload.options.contentType, "application/pdf");
  assert.equal(state.upload.options.upsert, false);
  assert.equal(state.document.user_id, "workspace-1");
  assert.equal(state.removed.length, 1);
  assert.equal(state.removed[0], state.upload.path);
  assert.match(messages[0], /metadata insert failed/);
});

test("backup export aborts before download when a private document path escapes the workspace", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "exports.js"),
      "utf8",
    ),
    context,
  );
  const tables = [
    "pd_properties",
    "pd_accounts",
    "pd_agreement_versions",
    "pd_payments",
    "pd_expenses",
    "pd_deposit_entries",
    "pd_documents",
    "pd_import_batches",
    "pd_audit_events",
    "pd_workspace_members",
    "pd_property_holders",
  ];
  const button = { textContent: "Export backup", disabled: false };
  const state = {
    user: { id: "workspace-1" },
    workspaceOwnerId: "workspace-1",
    accounts: [],
    properties: [],
    client: {
      from(table) {
        assert.ok(tables.includes(table));
        return {
          select() {
            return {
              async range() {
                return {
                  data:
                    table === "pd_documents"
                      ? [
                          {
                            id: "doc-1",
                            user_id: "workspace-1",
                            storage_path: "other-workspace/property/file.pdf",
                            file_name: "file.pdf",
                          },
                        ]
                      : [],
                  error: null,
                };
              },
            };
          },
        };
      },
    },
  };
  const messages = [];
  const downloads = [];
  const feature = context.window.PropertyDeskExports.create({
    $: (id) => (id === "export-all" ? button : null),
    state,
    createBackup: () =>
      assert.fail("invalid paths must stop before backup creation"),
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    prettyType: (value) => value,
    accountBalance: () => 0,
    downloadBlob: (blob) => downloads.push(blob),
    zipUtils: {
      createZip: () =>
        assert.fail("invalid paths must stop before zip creation"),
    },
  });

  await feature.exportAll();

  assert.equal(downloads.length, 0);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Export backup");
  assert.match(messages.at(-1), /invalid private storage path/);
});

test("password reset requests keep generic feedback and restore the submit control", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "auth.js"), "utf8"),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "owner@example.com",
        disabled: false,
        textContent: "",
        reportValidity: () => true,
      });
    }
    return elements.get(id);
  };
  const resetCalls = [];
  const feature = context.window.PropertyDeskAuth.create({
    $: element,
    state: {
      client: {
        auth: {
          async resetPasswordForEmail(...args) {
            resetCalls.push(args);
            return { error: { message: "account-specific failure" } };
          },
        },
      },
    },
    fetchAll: async () => {},
    toast() {},
    windowRef: {
      location: { origin: "https://example.test", pathname: "/propertydesk/" },
    },
    documentRef: {},
  });

  await feature.requestPasswordReset();

  assert.equal(resetCalls.length, 1);
  assert.equal(resetCalls[0][0], "owner@example.com");
  assert.equal(
    resetCalls[0][1].redirectTo,
    "https://example.test/propertydesk/",
  );
  assert.equal(
    element("auth-message").textContent,
    "Unable to request a reset right now. Try again later.",
  );
  assert.equal(element("forgot-password").disabled, false);
});

test("workspace settings render member labels and escape untrusted text", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "",
        innerHTML: "",
        classList: {
          toggle(name, hidden) {
            this.lastToggle = [name, hidden];
          },
        },
      });
    return elements.get(id);
  };
  const state = {
    user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
    workspaceOwnerId: "owner-1",
    workspaceMembers: [
      {
        member_user_id: "owner-1",
        display_name: "<Owner>",
        email: "owner@example.test",
        is_owner: true,
      },
      {
        member_user_id: "member-1",
        display_name: "Member",
        email: "member@example.test",
        is_owner: false,
      },
    ],
    reminderLogs: [],
    accounts: [],
    properties: [],
  };
  const feature = context.window.PropertyDeskWorkspace.create({
    $: element,
    state,
    esc: (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      ),
    fmtDate: () => "Oct 2026",
    money: () => "$0.00",
    toast() {},
    fetchAll: async () => {},
    updateGreeting() {},
    confirmAction: () => true,
  });

  feature.renderWorkspaceSettings();

  assert.equal(element("display-name").value, "Owner");
  assert.match(element("workspace-members").innerHTML, /&lt;Owner&gt;/);
  assert.match(element("workspace-members").innerHTML, /Full workspace access/);
  assert.deepEqual(element("member-add-form").classList.lastToggle, [
    "hidden",
    false,
  ]);
  assert.match(element("reminder-activity").innerHTML, /Reminders are off/);
});

test("adding a workspace member clears the address only after successful refresh", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: id === "member-email" ? " spouse@example.test " : "",
        classList: { toggle() {} },
      });
    return elements.get(id);
  };
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskWorkspace.create({
    $: element,
    state: {
      client: {
        async rpc(name, args) {
          calls.push([name, args]);
          return { error: null };
        },
      },
      workspaceMembers: [],
      reminderLogs: [],
      accounts: [],
      properties: [],
      user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
      workspaceOwnerId: "owner-1",
    },
    esc: String,
    fmtDate: () => "",
    money: () => "",
    toast: (message) => messages.push(message),
    fetchAll: async () => calls.push(["refresh"]),
    updateGreeting() {},
  });

  await feature.addWorkspaceMember({ preventDefault() {} });

  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "pd_add_workspace_member");
  assert.equal(calls[0][1].p_email, "spouse@example.test");
  assert.equal(calls[1][0], "refresh");
  assert.equal(element("display-name").value, "Owner");
  assert.equal(element("member-email").value, "");
  assert.equal(messages.at(-1), "Workspace member added");
});

test("property quick notes normalize whitespace and scope updates to the workspace", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-management.js"),
      "utf8",
    ),
    context,
  );
  const updates = [];
  const messages = [];
  let refreshed = false;
  const state = {
    workspaceOwnerId: "workspace-1",
    selectedPropertyId: "property-1",
    properties: [
      { id: "property-1", address: "10 Main St", notes: "Old note" },
    ],
    client: {
      from(table) {
        assert.equal(table, "pd_properties");
        return {
          update(values) {
            updates.push(values);
            return {
              eq(column, value) {
                updates.push([column, value]);
                return {
                  eq: async (ownerColumn, ownerId) => {
                    updates.push([ownerColumn, ownerId]);
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskPropertyManagement.create({
    $: () => {},
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      refreshed = true;
    },
    todayIso: () => "2026-10-04",
    streetAddress: (property) => property.address,
    openPropertyDetails() {},
    promptAction: () => "  Follow-up\n needed   soon ",
  });

  await feature.editPropertyQuickNote("property-1");

  assert.equal(updates[0].notes, "Follow-up needed soon");
  assert.equal(updates[1][0], "id");
  assert.equal(updates[1][1], "property-1");
  assert.equal(updates[2][0], "user_id");
  assert.equal(updates[2][1], "workspace-1");
  assert.equal(refreshed, true);
  assert.equal(messages.at(-1), "Property note saved");
});

test("ledger actions keep deposit adjustments separate and retain void audit reasons", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-actions.js"),
      "utf8",
    ),
    context,
  );
  const prompts = [
    "250.00",
    "Deposit retention per move-out inspection",
    "Entered in error",
  ];
  const inserts = [];
  const updates = [];
  const messages = [];
  const calls = [];
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [{ id: "rental-1", account_type: "rental" }],
    client: {
      from(table) {
        return {
          async insert(payload) {
            inserts.push([table, payload]);
            return { error: null };
          },
          update(payload) {
            updates.push([table, payload]);
            return {
              eq(column, value) {
                updates.push([column, value]);
                return {
                  eq(statusColumn, status) {
                    updates.push([statusColumn, status]);
                    return {
                      select() {
                        return {
                          async maybeSingle() {
                            return { data: { id: "payment-1" }, error: null };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskLedgerActions.create({
    $: (id) => ({ id }),
    state,
    moneyInput: Number,
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => calls.push("refresh"),
    closeModal: (modal) => calls.push(["close", modal.id]),
    openAccountDetails: async (id) => calls.push(["open-account", id]),
    confirmAction: () => true,
    promptAction: () => prompts.shift(),
    timestamp: () => "2026-10-04T12:00:00.000Z",
  });

  await feature.recordDepositAdjustment("rental-1", "retained");
  await feature.voidTransaction("income", "payment-1");

  assert.equal(inserts[0][0], "pd_deposit_entries");
  assert.equal(inserts[0][1].user_id, "workspace-1");
  assert.equal(inserts[0][1].amount, 250);
  assert.equal(
    inserts[0][1].reason,
    "Deposit retention per move-out inspection",
  );
  assert.equal(updates[0][0], "pd_payments");
  assert.equal(updates[0][1].status, "voided");
  assert.equal(updates[0][1].voided_at, "2026-10-04T12:00:00.000Z");
  assert.equal(updates[0][1].void_reason, "Entered in error");
  assert.equal(messages.at(-1), "Transaction voided; original entry preserved");
  assert.equal(calls.filter((call) => call === "refresh").length, 2);
});

test("transaction corrections reopen posted payments and expenses with audit reasons", () => {
  const context = vm.createContext({
    window: {},
    Event: class MockEvent {
      constructor(type) {
        this.type = type;
      }
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-actions.js"),
      "utf8",
    ),
    context,
  );
  const values = new Map();
  const field = (id) => {
    if (!values.has(id))
      values.set(id, {
        value: "",
        textContent: "",
        dispatchEvent(event) {
          this.lastEvent = event.type;
        },
      });
    return values.get(id);
  };
  const accountSelect = {
    value: "",
    options: [{ value: "account-1" }],
    add(option) {
      this.options.push(option);
    },
  };
  values.set("payment-account", accountSelect);
  values.set("payment-modal", {
    querySelector: () => field("payment-eyebrow"),
  });
  values.set("expense-modal", {
    querySelector: () => field("expense-eyebrow"),
  });
  values.set("payment-save-next", {
    classList: { add: (value) => (field("save-next-class").value = value) },
  });
  values.set("expense-save-next", {
    classList: {
      add: (value) => (field("expense-save-next-class").value = value),
    },
  });

  const state = {
    accounts: [
      {
        id: "account-1",
        name: "Land contract",
        party_name: "Buyer",
        account_type: "land_contract",
      },
    ],
    payments: [
      {
        id: "payment-1",
        status: "posted",
        account_id: "account-1",
        amount: 75,
        received_date: "2026-10-02",
        payment_method: "check",
        income_category: "installment",
        memo: "Receipt 14",
      },
    ],
    expenses: [
      {
        id: "expense-1",
        status: "posted",
        property_id: "property-1",
        account_id: "account-1",
        amount: 40,
        expense_date: "2026-10-03",
        category: "repairs",
        payee: "Plumber",
        payment_method: "check",
        memo: "Invoice 2",
      },
    ],
    pendingCorrection: null,
  };
  const calls = [];
  const feature = context.window.PropertyDeskLedgerActions.create({
    $: (id) => field(id),
    state,
    promptAction: () => "Corrected bank posting date",
    prettyType: () => "Land contract",
    openPayment: () => calls.push("open-payment"),
    openExpense: () => calls.push("open-expense"),
    updateAllocationPreview: () => calls.push("refresh-allocation"),
    toast: (message) => calls.push(message),
  });

  feature.correctTransaction("income", "payment-1");

  assert.equal(field("payment-amount").value, 75);
  assert.equal(field("payment-date").value, "2026-10-02");
  assert.equal(field("payment-method").value, "check");
  assert.equal(state.pendingCorrection.kind, "payment");
  assert.equal(state.pendingCorrection.id, "payment-1");
  assert.equal(state.pendingCorrection.reason, "Corrected bank posting date");
  assert.equal(field("payment-modal-title").textContent, "Correct payment");
  assert.equal(field("payment-eyebrow").textContent, "TRANSACTION CORRECTION");
  assert.deepEqual(calls, ["open-payment", "refresh-allocation"]);

  feature.correctTransaction("expense", "expense-1");

  assert.equal(field("expense-amount").value, 40);
  assert.equal(field("expense-date").value, "2026-10-03");
  assert.equal(field("expense-category").value, "repairs");
  assert.equal(field("expense-property").lastEvent, "change");
  assert.equal(state.pendingCorrection.kind, "expense");
  assert.equal(state.pendingCorrection.id, "expense-1");
  assert.equal(field("expense-modal-title").textContent, "Correct expense");
  assert.equal(field("expense-eyebrow").textContent, "TRANSACTION CORRECTION");
  assert.deepEqual(calls, [
    "open-payment",
    "refresh-allocation",
    "open-expense",
  ]);
});

test("reminder preview uses current form values and escapes recipient-facing text", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-preview.js"),
      "utf8",
    ),
    context,
  );
  const values = {
    "account-property": { value: "property-1" },
    "account-id": { value: "" },
    "account-type": { value: "land_contract" },
    "account-name": { value: "Installment" },
    "account-party": { value: "<Renter>" },
    "account-start": { value: "" },
    "account-next-due": { value: "" },
    "account-payment": { value: "550" },
    "account-frequency": { value: "monthly" },
    "account-party-email": { value: "buyer@example.test" },
    "reminder-preview-content": { innerHTML: "" },
  };
  const state = {
    properties: [{ id: "property-1", address: "10 Main <St>" }],
    payments: [],
  };
  const calls = [];
  const feature = context.window.PropertyDeskReminderPreview.create({
    $: (id) => values[id],
    state,
    amountDueSince: (accounts, payments, start, end) => {
      calls.push({ account: accounts[0], payments, start, end });
      return 550;
    },
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-04",
    monthEnd: () => "2026-10-31",
    moneyInput: Number,
    toast: (message) => calls.push(message),
    dateOnly: () => ({ toLocaleDateString: () => "October 2026" }),
    monthStart: () => "2026-10-01",
    propertyAddress: (property) => property.address,
    money: (value) => "USD " + Number(value).toFixed(2),
    esc: (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      ),
    openModal: (id) => calls.push(id),
  });

  feature.previewReminderEmail();

  assert.equal(calls[0].account.payment_amount, 550);
  assert.equal(calls[0].start, "2026-10-01");
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /buyer@example\.test/,
  );
  assert.match(values["reminder-preview-content"].innerHTML, /&lt;Renter&gt;/);
  assert.match(values["reminder-preview-content"].innerHTML, /&lt;St&gt;/);
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /Hello &lt;Renter&gt;,<br><br>Our records show no rent or installment payment recorded for October 2026\./,
  );
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /Unpaid due as of 2026-10-31: USD 550\.00<br>Property: 10 Main &lt;St&gt;/,
  );
  assert.equal(calls.at(-1), "reminder-preview-modal");
});

test("recording a loan payment does not invent principal or interest splits", async () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "record-forms.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        classList: { add() {}, remove() {}, toggle() {} },
        focus() {},
        reset() {},
        value: "",
      });
    }
    return elements.get(id);
  };
  element("payment-account").value = "account-1";
  element("payment-amount").value = "550.00";
  element("payment-date").value = "2026-10-04";
  element("payment-method").value = "manual";
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [{ id: "account-1", account_type: "land_contract" }],
    pendingCorrection: null,
    client: {
      from(table) {
        assert.equal(table, "pd_payments");
        return {
          async insert(payload) {
            state.savedPayment = payload;
            return { error: null };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskRecordForms.create({
    $: element,
    state,
    moneyInput: (value) => Number(value),
    todayIso: () => "2026-10-04",
    toast() {},
    closeModal() {},
    fetchAll: async () => {},
    fillSelect() {},
    populateFormOptions() {},
    prettyType: (value) => value,
    paymentFrequencyLabel: (value) => value,
    openModal() {},
  });

  await feature.savePayment({ preventDefault() {} });

  assert.equal(state.savedPayment.amount, 550);
  assert.equal(state.savedPayment.income_category, "installment");
  assert.equal(state.savedPayment.principal_amount, 0);
  assert.equal(state.savedPayment.interest_amount, 0);
  assert.equal(state.savedPayment.unapplied_amount, 550);
});

test("CSV imports report a real zero accepted by the server as zero", async () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "imports.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        classList: { add() {}, remove() {}, toggle() {} },
        checked: false,
        disabled: false,
        textContent: "",
        value: "",
      });
    }
    return elements.get(id);
  };
  const state = {
    accounts: [],
    properties: [],
    client: { rpc: async () => ({ data: { rows_accepted: 0 }, error: null }) },
  };
  const feature = context.window.PropertyDeskImportFeature.create({
    $: element,
    state,
    parseCSV: () => [{}],
    selectImportRows: (rows) => rows,
    validateAccountRows: () => ({
      valid: [{ account_name: "Test" }],
      errors: [],
      total: 1,
    }),
    validateExpenseRows() {},
    validatePaymentRows() {},
    esc: (value) => String(value ?? ""),
    todayIso: () => "2026-10-04",
    openModal() {},
    closeModal() {},
    fetchAll: async () => {},
    toast() {},
  });

  await feature.importAccounts({ name: "accounts.csv", text: async () => "" });
  await state.pendingImport.commit(
    state.pendingImport.rows,
    state.pendingImport,
  );

  assert.match(
    element("import-status").textContent,
    /Imported 0 accounts; 1 row was skipped/,
  );
});
