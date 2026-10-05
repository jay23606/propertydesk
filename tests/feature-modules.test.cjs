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
    "openPropertyPayment",
    "openExpense",
    "correctTransaction",
  ]) {
    assert.equal(typeof feature[action], "function", action);
  }
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
    fs.readFileSync(path.join(__dirname, "..", "features", "documents.js"), "utf8"),
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
    openPropertyDetails: () => assert.fail("failed metadata must not reopen details"),
    makeId: () => "file-id",
  });

  await feature.uploadPropertyDocument(input);

  assert.equal(input.value, "");
  assert.equal(state.upload.path, "workspace-1/property-1/file-id-Agreement.pdf");
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
    fs.readFileSync(path.join(__dirname, "..", "features", "exports.js"), "utf8"),
    context,
  );
  const tables = [
    "pd_properties", "pd_accounts", "pd_agreement_versions", "pd_payments",
    "pd_expenses", "pd_deposit_entries", "pd_documents", "pd_import_batches",
    "pd_audit_events", "pd_workspace_members", "pd_property_holders",
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
                  data: table === "pd_documents"
                    ? [{ id: "doc-1", user_id: "workspace-1", storage_path: "other-workspace/property/file.pdf", file_name: "file.pdf" }]
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
    $: (id) => id === "export-all" ? button : null,
    state,
    createBackup: () => assert.fail("invalid paths must stop before backup creation"),
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    prettyType: (value) => value,
    accountBalance: () => 0,
    downloadBlob: (blob) => downloads.push(blob),
    zipUtils: { createZip: () => assert.fail("invalid paths must stop before zip creation") },
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
    state: { client: { auth: { async resetPasswordForEmail(...args) {
      resetCalls.push(args);
      return { error: { message: "account-specific failure" } };
    } } } },
    fetchAll: async () => {},
    toast() {},
    windowRef: { location: { origin: "https://example.test", pathname: "/propertydesk/" } },
    documentRef: {},
  });

  await feature.requestPasswordReset();

  assert.equal(resetCalls.length, 1);
  assert.equal(resetCalls[0][0], "owner@example.com");
  assert.equal(resetCalls[0][1].redirectTo, "https://example.test/propertydesk/");
  assert.equal(element("auth-message").textContent, "Unable to request a reset right now. Try again later.");
  assert.equal(element("forgot-password").disabled, false);
});

test("workspace settings render member labels and escape untrusted text", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "workspace.js"), "utf8"),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      value: "",
      innerHTML: "",
      classList: { toggle(name, hidden) { this.lastToggle = [name, hidden]; } },
    });
    return elements.get(id);
  };
  const state = {
    user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
    workspaceOwnerId: "owner-1",
    workspaceMembers: [
      { member_user_id: "owner-1", display_name: "<Owner>", email: "owner@example.test", is_owner: true },
      { member_user_id: "member-1", display_name: "Member", email: "member@example.test", is_owner: false },
    ],
    reminderLogs: [],
    accounts: [],
    properties: [],
  };
  const feature = context.window.PropertyDeskWorkspace.create({
    $: element,
    state,
    esc: (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])),
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
  assert.deepEqual(element("member-add-form").classList.lastToggle, ["hidden", false]);
  assert.match(element("reminder-activity").innerHTML, /Reminders are off/);
});

test("adding a workspace member clears the address only after successful refresh", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "workspace.js"), "utf8"),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { value: id === "member-email" ? " spouse@example.test " : "", classList: { toggle() {} } });
    return elements.get(id);
  };
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskWorkspace.create({
    $: element,
    state: {
      client: { async rpc(name, args) { calls.push([name, args]); return { error: null }; } },
      workspaceMembers: [], reminderLogs: [], accounts: [], properties: [],
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
