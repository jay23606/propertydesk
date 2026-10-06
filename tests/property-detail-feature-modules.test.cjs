const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property and account detail modules expose separate workflows", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["property-details.js", "account-details.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }

  const property = context.window.PropertyDeskPropertyDetails.create({});
  const account = context.window.PropertyDeskAccountDetails.create({});
  assert.equal(typeof property.openPropertyDetails, "function");
  assert.equal(typeof account.openAccountDetails, "function");
});

test("opening a property delegates modal markup and preserves scoped details", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "property-documents-view.js",
    "property-details-view.js",
    "property-details.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const property = { id: "property-1", name: "<Oak House>", archived_at: null };
  const account = {
    id: "account-1",
    property_id: property.id,
    account_type: "note",
    status: "active",
    name: "<Private Note>",
    party_name: "Buyer",
    payment_amount: 500,
    payment_frequency: "monthly",
  };
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, { textContent: "", innerHTML: "", disabled: false });
    }
    return elements.get(id);
  };
  const opened = [];
  const activityCalls = [];
  const documentsView = context.window.PropertyDeskPropertyDocumentsView.create(
    {
      fmtDate: (value) => value,
      esc: (value) =>
        String(value ?? "")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;"),
    },
  );
  const detailsView = context.window.PropertyDeskPropertyDetailsView.create({
    money: (value) => `$${Number(value).toFixed(2)}`,
    fmtDate: (value) => value,
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
    prettyType: (value) => value,
    paymentFrequencyLabel: () => "Monthly",
    accountBalance: () => 9000,
    propertyDocumentsHTML: documentsView.propertyDocumentsHTML,
  });
  const feature = context.window.PropertyDeskPropertyDetails.create({
    $,
    state: {
      auditRequestId: 0,
      selectedPropertyId: null,
      properties: [property],
      accounts: [account, { id: "elsewhere", property_id: "property-2" }],
      documents: [
        {
          id: "doc-1",
          property_id: property.id,
          file_name: "<agreement>.pdf",
          created_at: "2026-10-01",
          content_type: "application/pdf",
        },
        { id: "other-doc", property_id: "property-2", file_name: "other.pdf" },
      ],
      workspaceMembers: [
        { member_user_id: "member-1", display_name: "<Manager>" },
      ],
      propertyHolders: [
        { property_id: property.id, member_user_id: "member-1" },
      ],
    },
    openModal: (id) => opened.push(id),
    propertyAddress: () => "Oak House address",
    renderPropertyActivity: (...args) => {
      activityCalls.push(args);
      return {
        incomeTotal: 600,
        expenseTotal: 75,
        html: "<section>Recent activity</section>",
      };
    },
    propertyDetailsHTML: detailsView.propertyDetailsHTML,
  });

  feature.openPropertyDetails(property.id);

  assert.equal(activityCalls.length, 1);
  assert.equal(activityCalls[0][0], property.id);
  assert.deepEqual(activityCalls[0][1], [account]);
  assert.equal(
    elements.get("property-detail-title").textContent,
    property.name,
  );
  assert.equal(
    elements.get("property-detail-address").textContent,
    "Oak House address",
  );
  assert.equal(elements.get("property-detail-add-income").disabled, false);
  assert.equal(
    elements.get("property-archive-toggle").textContent,
    "Archive property",
  );
  const html = elements.get("property-detail-content").innerHTML;
  assert.match(html, /&lt;Private Note&gt;/);
  assert.match(html, /&lt;Manager&gt;/);
  assert.match(html, /&lt;agreement&gt;\.pdf/);
  assert.match(html, /\$600\.00/);
  assert.match(html, /Recent activity/);
  assert.doesNotMatch(html, /other\.pdf/);
  assert.deepEqual(opened, ["property-detail-modal"]);
});

test("property activity details include posted and voided records without counting voids", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "property-activity-model.js",
    "property-activity-view.js",
    "property-activity-details.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const activity = context.window.PropertyDeskPropertyActivityDetails.create({
    state: {
      payments: [
        {
          account_id: "account-1",
          amount: 500,
          received_date: "2026-10-04",
          status: "posted",
          memo: "October rent",
        },
        {
          account_id: "account-1",
          amount: 90,
          received_date: "2026-10-03",
          status: "voided",
          memo: "<cancelled>",
        },
      ],
      expenses: [
        {
          property_id: "property-1",
          amount: 75,
          expense_date: "2026-10-02",
          status: "posted",
          payee: "Plumber",
        },
        {
          property_id: "property-1",
          amount: 40,
          expense_date: "2026-10-01",
          status: "voided",
          payee: "Old vendor",
        },
      ],
    },
    isPosted: (record) => record.status !== "voided",
    sumIncome: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    sumOperatingExpenses: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    money: (amount) =>
      `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    fmtDate: (date) => date,
    esc: (value) =>
      String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
  });

  const result = activity.renderPropertyActivity("property-1", [
    { id: "account-1", name: "Rental" },
  ]);
  assert.equal(result.incomeTotal, 500);
  assert.equal(result.expenseTotal, 75);
  assert.match(result.html, /October rent/);
  assert.match(result.html, /transaction-voided/);
  assert.match(result.html, /&lt;cancelled&gt;/);
  assert.match(result.html, /−\$75\.00/);
});

test("property activity model aggregates posted cash flow and sorts eight recent rows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-activity-model.js"),
      "utf8",
    ),
    context,
  );
  const state = {
    payments: [
      {
        account_id: "account-1",
        amount: 500,
        received_date: "2026-10-04",
        status: "posted",
      },
      {
        account_id: "other-account",
        amount: 999,
        received_date: "2026-10-05",
        status: "posted",
      },
    ],
    expenses: Array.from({ length: 9 }, (_, index) => ({
      property_id: "property-1",
      amount: index + 1,
      expense_date: `2026-10-${String(index + 1).padStart(2, "0")}`,
      status: "posted",
      payee: `Vendor ${index + 1}`,
    })),
  };
  const statusChecks = [];
  const model = context.window.PropertyDeskPropertyActivityModel.create({
    state,
    isPosted: (record) => {
      statusChecks.push(record);
      return record.status === "posted";
    },
    sumIncome: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    sumOperatingExpenses: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
  });

  const result = model.buildPropertyActivity("property-1", [
    { id: "account-1", name: "Rental" },
  ]);

  assert.equal(result.incomeTotal, 500);
  assert.equal(result.expenseTotal, 45);
  assert.equal(result.transactions.length, 8);
  assert.equal(result.transactions[0].date, "2026-10-09");
  assert.equal(result.transactions[0].amount, -9);
  assert.equal(result.transactions.at(-1).date, "2026-10-03");
  assert.equal(statusChecks.length, 10);
});

test("property view actions route payment, note, address, and add-account actions", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-view-events.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  let clickHandler;
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "",
        addEventListener(name, handler) {
          if (id === "properties-table" && name === "click")
            clickHandler = handler;
        },
      });
    }
    return elements.get(id);
  };
  const feature = context.window.PropertyDeskPropertyViewEvents.create({
    $,
    openPayment: (id) => calls.push(["payment", id]),
    editPropertyQuickNote: (id) => calls.push(["note", id]),
    openPropertyDetails: (id) => calls.push(["open", id]),
    openAccountForProperty: (id) => calls.push(["open-account", id]),
  });
  feature.attachEvents();

  for (const [selector, dataset] of [
    ["[data-account-payment]", { accountPayment: "account-1" }],
    ["[data-property-note]", { propertyNote: "property-1" }],
    ["[data-property-open]", { propertyOpen: "property-2" }],
    ["[data-property-account]", { propertyAccount: "property-3" }],
  ]) {
    clickHandler({
      target: { closest: (value) => (value === selector ? { dataset } : null) },
      preventDefault() {},
      stopPropagation() {},
    });
  }

  assert.deepEqual(calls, [
    ["payment", "account-1"],
    ["note", "property-1"],
    ["open", "property-2"],
    ["open-account", "property-3"],
  ]);
});

test("property action router loads after its view and is precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/property-views.js") <
      html.indexOf("features/property-view-events.js") &&
      html.indexOf("features/property-view-events.js") < html.indexOf("app.js"),
    "property view should load before its action router and the app",
  );
  assert.match(worker, /'\.\/features\/property-view-events\.js'/);
});

test("Properties table templates escape untrusted labels and render visible totals", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-portfolio-table.js"),
      "utf8",
    ),
    context,
  );
  const escapeHTML = (value) =>
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
    );
  const table = context.window.PropertyDeskPropertyPortfolioTable.create({
    esc: escapeHTML,
    money: (value) => `$${Number(value).toFixed(2)}`,
    paymentFrequencyLabel: () => "Monthly",
  });

  const addressHTML = table.propertyAddressCell(
    { id: "<property>", notes: "<repair>" },
    "<10 Oak St>",
  );
  assert.match(addressHTML, /&lt;property&gt;/);
  assert.match(addressHTML, /&lt;repair&gt;/);
  assert.doesNotMatch(addressHTML, /<repair>/);

  const totalsHTML = table.totalsRowHTML({
    unpaidDue: 50,
    scheduledPayment: 125,
    loanBalance: 1000,
    loanCount: 1,
  });
  assert.match(totalsHTML, /\$50\.00/);
  assert.match(totalsHTML, /\$125\.00/);
  assert.match(totalsHTML, /\$1000\.00/);
});

test("property detail events own editing and quick-action bindings", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "property-detail-events.js",
    "property-holder-events.js",
    "property-detail-quick-actions.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const handlers = new Map();
  const elements = new Map();
  const calls = [];
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: "",
        addEventListener(event, handler) {
          const key = `${id}:${event}`;
          handlers.set(key, [...(handlers.get(key) || []), handler]);
        },
      });
    }
    return elements.get(id);
  };
  const propertyModal = getElement("property-detail-modal");
  const feature = context.window.PropertyDeskPropertyDetailEvents.create({
    $: getElement,
    state: {
      selectedPropertyId: "property-1",
      accounts: [{ id: "account-1" }],
    },
    closeModal: (modal) => calls.push(`close:${modal.id}`),
    editAccount: (account) => calls.push(`edit:${account.id}`),
    openAccountDetails: (id) => calls.push(`open-account:${id}`),
  });
  const holderEvents = context.window.PropertyDeskPropertyHolderEvents.create({
    $: getElement,
    savePropertyHolders: () => calls.push("save-holders"),
  });
  const quickActionState = { selectedPropertyId: "property-1" };
  const quickActions =
    context.window.PropertyDeskPropertyDetailQuickActions.create({
      $: getElement,
      state: quickActionState,
      closeModal: (modal) => calls.push(`close:${modal.id}`),
      openPayment: (...args) => calls.push(`payment:${args.join(":")}`),
      openExpense: (propertyId) => calls.push(`expense:${propertyId}`),
      openAccountForProperty: (propertyId) =>
        calls.push(`open-account:${propertyId}`),
      toggleArchiveProperty: () => calls.push("archive"),
    });

  feature.attachEvents();
  holderEvents.attachEvents();
  quickActions.attachEvents();
  const dispatch = (key, event) => {
    for (const handler of handlers.get(key) || []) handler(event);
  };
  dispatch("property-detail-content:click", {
    target: {
      closest: (selector) =>
        ({
          "[data-edit-account]": { dataset: { editAccount: "account-1" } },
          "[data-detail]": { dataset: { detail: "account-1" } },
        })[selector] || null,
    },
    preventDefault() {},
  });
  dispatch("property-detail-content:click", {
    target: {
      closest: (selector) =>
        selector === "[data-save-holders]" ? { dataset: {} } : null,
    },
  });
  dispatch("property-detail-content:click", {
    target: {
      closest: (selector) =>
        selector === "[data-detail]"
          ? { dataset: { detail: "account-1" } }
          : null,
    },
  });
  dispatch("property-detail-add-income:click");
  dispatch("property-detail-add-expense:click");
  dispatch("property-detail-add-account:click");
  dispatch("property-archive-toggle:click");

  assert.equal(propertyModal.id, "property-detail-modal");
  assert.deepEqual(calls, [
    "close:property-detail-modal",
    "edit:account-1",
    "save-holders",
    "close:property-detail-modal",
    "open-account:account-1",
    "close:property-detail-modal",
    "payment::property-1",
    "close:property-detail-modal",
    "expense:property-1",
    "close:property-detail-modal",
    "open-account:property-1",
    "archive",
  ]);
  const callsBeforeNoSelection = calls.length;
  quickActionState.selectedPropertyId = null;
  dispatch("property-detail-add-income:click");
  dispatch("property-detail-add-expense:click");
  dispatch("property-detail-add-account:click");
  assert.equal(calls.length, callsBeforeNoSelection);
});

test("property detail document events route private document actions to document workflows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-detail-document-events.js",
      ),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const handlers = new Map();
  const feature =
    context.window.PropertyDeskPropertyDetailDocumentEvents.create({
      $: (id) => ({
        addEventListener(name, handler) {
          handlers.set(`${id}:${name}`, handler);
        },
      }),
      openPropertyDocument: (id) => calls.push(["open", id]),
      deletePropertyDocument: (id) => calls.push(["delete", id]),
      uploadPropertyDocument: (input) => calls.push(["upload", input.id]),
    });
  feature.attachEvents();

  let prevented = false;
  let propagationStopped = false;
  handlers.get("property-detail-content:click")({
    target: {
      closest: (value) =>
        value === "[data-open-document]"
          ? { dataset: { openDocument: "document-1" } }
          : null,
    },
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {
      propagationStopped = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(propagationStopped, true);
  handlers.get("property-detail-content:click")({
    target: {
      closest: (value) =>
        value === "[data-delete-document]"
          ? { dataset: { deleteDocument: "document-2" } }
          : null,
    },
    preventDefault() {
      assert.fail(
        "delete action should preserve its existing default behavior",
      );
    },
    stopPropagation() {
      assert.fail("delete action should preserve event bubbling");
    },
  });
  const input = {
    id: "agreement-input",
    matches: (selector) => selector === "[data-property-document]",
  };
  handlers.get("property-detail-content:change")({ target: input });

  assert.deepEqual(calls, [
    ["open", "document-1"],
    ["delete", "document-2"],
    ["upload", "agreement-input"],
  ]);
});

test("property detail content workflow connects activity summaries to property rendering", () => {
  let detailContext;
  let viewContext;
  let activityContext;
  const renderPropertyActivity = () => "activity";
  const propertyDetailsHTML = () => "property details html";
  const propertyDocumentsHTML = () => "documents html";
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyDocumentsView: {
        create: (options) => {
          viewContext = options;
          return { propertyDocumentsHTML };
        },
      },
      PropertyDeskPropertyDetailsView: {
        create: (options) => {
          viewContext.details = options;
          return { propertyDetailsHTML };
        },
      },
      PropertyDeskPropertyActivityDetails: {
        create: (options) => {
          activityContext = options;
          return { renderPropertyActivity };
        },
      },
      PropertyDeskPropertyDetails: {
        create: (options) => {
          detailContext = options;
          return { openPropertyDetails: () => "property details" };
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
        "property-detail-content-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const detailsDependencies = {
    $() {},
    state: {},
    isPosted() {},
    sumIncome() {},
    sumOperatingExpenses() {},
    money() {},
    fmtDate() {},
    esc() {},
    prettyType() {},
    paymentFrequencyLabel() {},
    accountBalance() {},
    openModal() {},
    propertyAddress() {},
  };
  const workflow =
    context.window.PropertyDeskPropertyDetailContentWorkflow.create(
      detailsDependencies,
    );

  assert.equal(viewContext.fmtDate, detailsDependencies.fmtDate);
  assert.equal(viewContext.esc, detailsDependencies.esc);
  const detailsViewDependencies = {
    money: detailsDependencies.money,
    esc: detailsDependencies.esc,
    prettyType: detailsDependencies.prettyType,
    paymentFrequencyLabel: detailsDependencies.paymentFrequencyLabel,
    accountBalance: detailsDependencies.accountBalance,
  };
  assert.deepEqual(
    Object.keys(viewContext.details).sort(),
    [...Object.keys(detailsViewDependencies), "propertyDocumentsHTML"].sort(),
  );
  assert.equal(
    viewContext.details.propertyDocumentsHTML,
    propertyDocumentsHTML,
  );
  assert.equal(detailContext.propertyDetailsHTML, propertyDetailsHTML);
  assert.equal(detailContext.renderPropertyActivity, renderPropertyActivity);
  assert.equal(activityContext.state, detailsDependencies.state);
  assert.equal(activityContext.isPosted, detailsDependencies.isPosted);
  assert.equal(activityContext.sumIncome, detailsDependencies.sumIncome);
  assert.deepEqual(Object.keys(workflow), ["openPropertyDetails"]);
  assert.equal(workflow.openPropertyDetails(), "property details");
});

test("property details workflow connects content with action and document routes", () => {
  const passed = {};
  const openPropertyDetails = () => "property details";
  const attachPropertyDetailEvents = () => "detail events";
  const attachPropertyDocumentEvents = () => "document events";
  const attached = [];
  let detailActionsContext;
  let documentContext;
  const context = vm.createContext({
    document: {},
    window: {
      PropertyDeskPropertyDetailContentWorkflow: {
        create: (options) => {
          passed.content = options;
          return { openPropertyDetails };
        },
      },
      PropertyDeskPropertyDetailActionsWorkflow: {
        create: (options) => {
          detailActionsContext = options;
          return {
            attachPropertyDetailEvents: () =>
              attached.push(attachPropertyDetailEvents()),
          };
        },
      },
      PropertyDeskPropertyDocumentWorkflow: {
        create: (options) => {
          documentContext = options;
          return {
            attachPropertyDocumentEvents: () =>
              attached.push(attachPropertyDocumentEvents()),
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-details-workflow.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    isPosted() {},
    sumIncome() {},
    sumOperatingExpenses() {},
    money() {},
    fmtDate() {},
    esc() {},
    prettyType() {},
    paymentFrequencyLabel() {},
    accountBalance() {},
    openModal() {},
    propertyAddress() {},
    toast() {},
    fetchAll() {},
    todayIso() {},
    closeModal() {},
    editAccount() {},
    openPayment() {},
    openExpense() {},
    openAccountForProperty() {},
    openAccountDetails() {},
    documentRef: {},
  };
  const workflow =
    context.window.PropertyDeskPropertyDetailsWorkflow.create(dependencies);

  assert.equal(passed.content.state, dependencies.state);
  assert.equal(detailActionsContext.openPropertyDetails, openPropertyDetails);
  assert.equal(documentContext.openPropertyDetails, openPropertyDetails);
  assert.deepEqual(
    Object.keys(detailActionsContext).sort(),
    [
      "$",
      "closeModal",
      "documentRef",
      "editAccount",
      "fetchAll",
      "openAccountDetails",
      "openAccountForProperty",
      "openExpense",
      "openPayment",
      "openPropertyDetails",
      "state",
      "toast",
      "todayIso",
    ].sort(),
  );
  assert.deepEqual(Object.keys(documentContext).sort(), [
    "$",
    "fetchAll",
    "openPropertyDetails",
    "state",
    "toast",
  ]);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachPropertyDetailEvents",
    "attachPropertyDocumentEvents",
    "openPropertyDetails",
  ]);
  assert.equal(workflow.openPropertyDetails, openPropertyDetails);
  workflow.attachPropertyDetailEvents();
  workflow.attachPropertyDocumentEvents();
  assert.deepEqual(attached, ["detail events", "document events"]);
});

test("property detail actions workflow composes administration and modal actions", () => {
  const passed = {};
  const action = () => {};
  const attachCalls = [];
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyHolderManagement: {
        create: () => ({ savePropertyHolders: action }),
      },
      PropertyDeskPropertyHolderEvents: {
        create: (options) => {
          passed.holderEvents = options;
          return { attachEvents: () => attachCalls.push("holders") };
        },
      },
      PropertyDeskPropertyArchive: {
        create: () => ({ toggleArchiveProperty: action }),
      },
      PropertyDeskPropertyDetailEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: () => attachCalls.push("content") };
        },
      },
      PropertyDeskPropertyDetailQuickActions: {
        create: (options) => {
          passed.quickActions = options;
          return {
            attachEvents: () =>
              attachCalls.push(passed.quickActions.toggleArchiveProperty),
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
        "property-detail-actions-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const quickActionDependencies = {
    state: {},
    closeModal: action,
    openPayment: action,
    openExpense: action,
    openAccountForProperty: action,
  };
  const workflow =
    context.window.PropertyDeskPropertyDetailActionsWorkflow.create({
      ...quickActionDependencies,
      documentRef: {},
    });

  assert.equal(passed.holderEvents.savePropertyHolders, action);
  assert.equal(passed.quickActions.openPayment, action);
  assert.equal(passed.quickActions.openExpense, action);
  assert.equal(passed.quickActions.openAccountForProperty, action);
  assert.equal(passed.quickActions.toggleArchiveProperty, action);
  assert.equal(Object.hasOwn(workflow, "editPropertyQuickNote"), false);
  workflow.attachPropertyDetailEvents();
  assert.deepEqual(attachCalls, ["content", "holders", action]);
});

test("property document workflow composes private file actions and event routing", () => {
  const passed = {};
  const action = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskDocuments: {
        create: (options) => {
          passed.documents = options;
          return {
            uploadPropertyDocument: action,
            deletePropertyDocument: action,
            openPropertyDocument: action,
          };
        },
      },
      PropertyDeskDocumentRepository: {
        create: (clientSource) => {
          passed.clientSource = clientSource;
          return {};
        },
      },
      PropertyDeskPropertyDetailDocumentEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: action };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-document-workflow.js"),
      "utf8",
    ),
    context,
  );
  const state = { client: null };
  const attach = context.window.PropertyDeskPropertyDocumentWorkflow.create({
    $: action,
    state,
    toast: action,
    fetchAll: action,
    openPropertyDetails: action,
  }).attachPropertyDocumentEvents;

  assert.equal(typeof attach, "function");
  assert.equal(passed.clientSource(), null);
  const client = {};
  state.client = client;
  assert.equal(passed.clientSource(), client);
  assert.equal(passed.events.uploadPropertyDocument, action);
  assert.equal(passed.events.deletePropertyDocument, action);
  assert.equal(passed.events.openPropertyDocument, action);
});
