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
  const account = { id: "account-9", party_name: "Buyer" };
  const feature = context.window.PropertyDeskPropertyViewEvents.create({
    $,
    getAccount: (id) => (id === account.id ? account : null),
    editAccount: (value) => calls.push(["edit-account", value.id]),
    openPayment: (id) => calls.push(["payment", id]),
    editPropertyQuickNote: (id) => calls.push(["note", id]),
    openPropertyDetails: (id) => calls.push(["open", id]),
    openAccountForProperty: (id) => calls.push(["open-account", id]),
  });
  feature.attachEvents();

  for (const [selector, dataset] of [
    ["[data-account-payment]", { accountPayment: "account-1" }],
    ["[data-account-edit]", { accountEdit: "account-9" }],
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
    ["edit-account", "account-9"],
    ["note", "property-1"],
    ["open", "property-2"],
    ["open-account", "property-3"],
  ]);
});

test("property action router loads after its view and is precached", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-view-events.js"),
    "utf8",
  );
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
  assert.doesNotMatch(source, /state\.accounts/);
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
    getAccount: (id) => (id === "account-1" ? { id } : null),
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
      getSelectedPropertyId: () => quickActionState.selectedPropertyId,
      closeModal: (modal) => calls.push(`close:${modal.id}`),
      openPayment: (...args) => calls.push(`payment:${args.join(":")}`),
      openExpense: (propertyId) => calls.push(`expense:${propertyId}`),
      openAccountForProperty: (propertyId) =>
        calls.push(`open-account:${propertyId}`),
      toggleArchiveProperty: () => calls.push("archive"),
    });

  feature.attachEvents();
  holderEvents.attachPropertyHolderEvents();
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
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const setup = fs.readFileSync(
    path.join(root, "features", "property-workspace-setup.js"),
    "utf8",
  );
  assert.match(app, /PropertyDeskPropertyWorkspaceSetup\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskPropertyDetail(?:Content|Management)Workflow\.create\(/,
  );
  const screenWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-screen-workflow.js"),
    "utf8",
  );
  assert.match(
    screenWorkflow,
    /workflows\.content\.create\([\s\S]*?workflows: workflows\.contentModules,[\s\S]*?workflows\.management\.create\([\s\S]*?openPropertyDetails: details\.openPropertyDetails/,
  );
  const workspaceWorkflow = fs.readFileSync(
    path.join(root, "features", "property-workspace-workflow.js"),
    "utf8",
  );
  assert.match(setup, /workflows\.workspace\.create\(/);
  assert.match(
    setup,
    /documents: \{[\s\S]*?documentRepository: services\.documentRepository/,
  );
  assert.match(workspaceWorkflow, /detail\.workflows\.screen\.create\(/);
  assert.match(workspaceWorkflow, /content: detail\.content/);
  assert.match(workspaceWorkflow, /workflows: overview\.workflows/);
  assert.match(workspaceWorkflow, /workflows: portfolio\.workflows/);
  assert.doesNotMatch(
    workspaceWorkflow,
    /\.\.\.detail|\.\.\.overview|\.\.\.portfolio/,
  );
  assert.doesNotMatch(workspaceWorkflow, /workflows:\s*detail\.workflows\b/);
  const workflow = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "property-detail-management-workflow.js",
    ),
    "utf8",
  );
  for (const feature of [
    "workflows.archive",
    "workflows.detailEvents",
    "workflows.quickActions",
  ])
    assert.match(workflow, new RegExp(`${feature}\\.create\\(`));
  assert.doesNotMatch(
    workflow,
    /window\.PropertyDeskProperty(?:Archive|DetailEvents|DetailQuickActions)\.create/,
  );
  const holderWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-holder-workflow.js"),
    "utf8",
  );
  assert.match(
    screenWorkflow,
    /workflows\.holders\.create\(\{\s*\.\.\.holders,[\s\S]*?workflows: workflows\.holderModules/,
  );
  assert.match(
    holderWorkflow,
    /workflows\.management\.create\([\s\S]*?workflows\.events\.create\(/,
  );
  assert.doesNotMatch(
    holderWorkflow,
    /window\.PropertyDeskPropertyHolder(?:Management|Events)\.create/,
  );
  const documentWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-document-workflow.js"),
    "utf8",
  );
  assert.match(
    screenWorkflow,
    /documents\.workflow\.create\([\s\S]*?repository: documents\.documentRepository/,
  );
  assert.match(
    documentWorkflow,
    /documentsWorkflow\.create\([\s\S]*?documentEventsWorkflow\.create\(/,
  );
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachPropertyDetailEvents,\s*attachPropertyHolderEvents,\s*attachPropertyQuickActionEvents,\s*attachPropertyDocumentEvents/,
  );
  assert.match(app, /attachPropertyQuickActionEvents/);
});
