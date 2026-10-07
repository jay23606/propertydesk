const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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

test("property detail model loads before its coordinator and is precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/property-details-model.js") <
      html.indexOf("features/property-details.js"),
  );
  assert.match(worker, /'\.\/features\/property-details-model\.js'/);
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
  const holderChoices = [{ value: "member-1" }, { value: "member-2" }];
  const calls = [];
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: "",
        querySelectorAll(selector) {
          return id === "property-detail-content" &&
            selector === "[data-holder-choice]:checked"
            ? holderChoices
            : [];
        },
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
    savePropertyHolders: (memberIds) =>
      calls.push(`save-holders:${memberIds.join(",")}`),
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
    "save-holders:member-1,member-2",
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

test("app composes property detail content, actions, and document routes", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const order = [
    "PropertyDeskPropertyDetailContentWorkflow.create(",
    "PropertyDeskPropertyDetailActionsWorkflow.create(",
    "PropertyDeskPropertyHolderWorkflow.create(",
    "PropertyDeskPropertyDocumentWorkflow.create(",
  ].map((marker) => app.indexOf(marker));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(
    order,
    [...order].sort((left, right) => left - right),
  );
  assert.match(
    app,
    /PropertyDeskPropertyDocumentWorkflow.create\(\{[\s\S]*?openPropertyDetails,/,
  );
  assert.match(
    app,
    /attachPropertyDetailEvents,\s*attachPropertyQuickActionEvents\s*\}/,
  );
  assert.match(
    app,
    /PropertyDeskPropertyHolderWorkflow\.create\([\s\S]*?attachPropertyHolderEvents/,
  );
  assert.match(
    app,
    /eventBinders:[\s\S]*?attachPropertyDetailEvents,\s*attachPropertyHolderEvents,\s*attachPropertyQuickActionEvents,\s*attachPropertyDocumentEvents/,
  );
  assert.doesNotMatch(app, /PropertyDeskPropertyDetailsWorkflow\.create\(/);
});

test("property detail actions workflow composes archive and modal actions", () => {
  const passed = {};
  const action = () => {};
  const attachCalls = [];
  const context = vm.createContext({
    window: {
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
    context.window.PropertyDeskPropertyDetailActionsWorkflow.create(
      quickActionDependencies,
    );

  assert.equal(passed.quickActions.openPayment, action);
  assert.equal(passed.quickActions.openExpense, action);
  assert.equal(passed.quickActions.openAccountForProperty, action);
  assert.equal(passed.quickActions.toggleArchiveProperty, action);
  assert.equal(Object.hasOwn(workflow, "editPropertyQuickNote"), false);
  workflow.attachPropertyDetailEvents();
  workflow.attachPropertyQuickActionEvents();
  assert.deepEqual(attachCalls, ["content", action]);
});

test("property holder workflow composes label saving with holder events", () => {
  const passed = {};
  const savePropertyHolders = () => "saved";
  let attached = 0;
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyHolderManagement: {
        create: (options) => {
          passed.management = options;
          return { savePropertyHolders };
        },
      },
      PropertyDeskPropertyHolderEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: () => attached++ };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-holder-workflow.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    openPropertyDetails() {},
  };
  const workflow =
    context.window.PropertyDeskPropertyHolderWorkflow.create(dependencies);

  assert.equal(passed.management.state, dependencies.state);
  assert.equal(passed.management.toast, dependencies.toast);
  assert.equal(passed.management.fetchAll, dependencies.fetchAll);
  assert.equal(
    passed.management.openPropertyDetails,
    dependencies.openPropertyDetails,
  );
  assert.equal(passed.events.savePropertyHolders, savePropertyHolders);
  assert.deepEqual(Object.keys(workflow), ["attachEvents"]);
  workflow.attachEvents();
  assert.equal(attached, 1);
});
