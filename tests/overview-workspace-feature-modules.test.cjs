const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("overview routes property-card and quick-payment actions to property workflows", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["overview.js", "overview-events.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const calls = [];
  let clickHandler;
  const events = context.window.PropertyDeskOverviewEvents.create({
    $: () => ({
      addEventListener(name, handler) {
        if (name === "click") clickHandler = handler;
      },
    }),
    openPropertyDetails: (id) => calls.push(["open", id]),
    openPropertyPayment: (id) => calls.push(["payment", id]),
  });
  events.attachEvents();

  for (const [selector, dataset] of [
    ["[data-property-card]", { propertyCard: "property-1" }],
    ["[data-property-payment]", { propertyPayment: "property-2" }],
  ]) {
    clickHandler({
      target: { closest: (value) => (value === selector ? { dataset } : null) },
      preventDefault() {},
      stopPropagation() {},
    });
  }

  assert.deepEqual(calls, [
    ["open", "property-1"],
    ["payment", "property-2"],
  ]);
});

test("overview renderer displays its summary model and quick-payment card", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "overview.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "overview-view.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, { textContent: "", innerHTML: "" });
    return elements.get(id);
  };
  const property = {
    id: "property-1",
    name: "One Oak",
    address: "1 Oak St",
    property_kind: "residential",
  };
  const summary = {
    propertyCount: 1,
    accountCount: 2,
    collected: 800,
    expected: 1300,
    recordedPaymentCount: 1,
    upcoming: [],
    recent: [],
    propertyCards: [
      {
        property,
        parties: "Alice Buyer",
        scheduledMonthly: 550,
        hasNonMonthly: false,
        loanBalance: 42000,
        hasLoanAccount: true,
        amountDue: 550,
      },
    ],
  };
  const money = (amount) => `$${Number(amount).toFixed(2)}`;
  const overviewView = context.window.PropertyDeskOverviewView.create({
    esc: String,
    prettyKind: String,
    money,
    propertyAddress: (record) => record.address,
    prettyType: String,
    fmtDate: String,
  });
  const feature = context.window.PropertyDeskOverview.create({
    $,
    money,
    overviewView,
    overviewModel: {
      buildOverview: () => summary,
    },
  });

  feature.renderOverview();

  assert.equal($("stat-properties").textContent, 1);
  assert.equal($("stat-accounts").textContent, 2);
  assert.equal($("stat-collected").textContent, "$800.00");
  assert.equal($("stat-expected").textContent, "$1300.00");
  assert.match($("overview-properties").innerHTML, /1 Oak St/);
  assert.match($("overview-properties").innerHTML, /Alice Buyer/);
  assert.match(
    $("overview-properties").innerHTML,
    /data-property-payment="property-1"/,
  );
  assert.match($("overview-properties").innerHTML, /\$42000\.00/);
  assert.match($("upcoming-list").innerHTML, /No upcoming payments yet/);

  summary.upcoming = [
    {
      account: {
        account_type: "rental",
        party_name: "Tenant One",
        payment_amount: 825,
        next_due_date: "2026-11-01",
      },
      property,
    },
  ];
  summary.recent = [
    {
      payment: {
        amount: 800,
        received_date: "2026-10-03",
        payment_method: "manual_check",
      },
      account: { party_name: "Tenant One" },
      property,
    },
  ];
  feature.renderOverview();

  assert.match($("upcoming-list").innerHTML, /Tenant One/);
  assert.match($("upcoming-list").innerHTML, /Due 2026-11-01/);
  assert.match($("activity-list").innerHTML, /Tenant One/);
  assert.match($("activity-list").innerHTML, /manual check/);
  assert.match($("activity-list").innerHTML, /2026-10-03/);
});

test("overview workflow composes dashboard models, rendering, and actions", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const workflow = fs.readFileSync(
    path.join(root, "features/overview-workflow.js"),
    "utf8",
  );
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const order = [
    "PropertyDeskOverviewPropertySummaryModel.create(",
    "PropertyDeskOverviewModel.create(",
    "PropertyDeskOverviewActivityModel.create(",
    "PropertyDeskOverview.create(",
    "PropertyDeskOverviewView.create(",
    "PropertyDeskOverviewEvents.create(",
  ].map((marker) => workflow.indexOf(marker));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(
    order,
    [...order].sort((left, right) => left - right),
  );
  assert.match(app, /PropertyDeskPropertyWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskOverview(?:Model|Events)?\.create\(/);
  assert.match(
    workflow,
    /PropertyDeskOverviewModel.create\(\{\s*state,\s*propertySummaryModel,[\s\S]*?postedOnOrAfter,/,
  );
  assert.match(app, /renderers:[\s\S]*?renderOverview/);
  assert.match(app, /eventBindersBeforeAuth:[\s\S]*?attachOverviewEvents/);
  const script = "features/overview-workflow.js";
  assert.ok(
    html.indexOf(script) < html.indexOf("app.js"),
    "overview workflow loads before app.js",
  );
  assert.match(worker, /'\.\/features\/overview-workflow\.js'/);
});

test("overview workflow exposes its renderer and event binder directly", () => {
  const calls = [];
  const propertySummaryModel = {};
  const overviewModel = {};
  const renderOverview = () => {};
  const attachEvents = () => {};
  const passed = {};
  const context = vm.createContext({
    window: {
      PropertyDeskOverviewPropertySummaryModel: {
        create: (options) => {
          calls.push("property summary");
          passed.propertySummary = options;
          return propertySummaryModel;
        },
      },
      PropertyDeskOverviewModel: {
        create: (options) => {
          calls.push("summary");
          passed.model = options;
          return overviewModel;
        },
      },
      PropertyDeskOverviewActivityModel: {
        create: (options) => {
          calls.push("activity model");
          passed.activityModelOptions = options;
          return {};
        },
      },
      PropertyDeskOverviewView: {
        create: (options) => {
          calls.push("markup");
          passed.markup = options;
          return {};
        },
      },
      PropertyDeskOverview: {
        create: (options) => {
          calls.push("view");
          passed.view = options;
          return { renderOverview };
        },
      },
      PropertyDeskOverviewEvents: {
        create: (options) => {
          calls.push("events");
          passed.events = options;
          return { attachEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features/overview-workflow.js"),
      "utf8",
    ),
    context,
  );

  const openPropertyDetails = () => {};
  const openPropertyPayment = () => {};
  const isPosted = () => true;
  const summarizeAccount = () => ({});
  const workflow = context.window.PropertyDeskOverviewWorkflow.create({
    openPropertyDetails,
    openPropertyPayment,
    isPosted,
    summarizeAccount,
  });

  assert.deepEqual(calls, [
    "property summary",
    "activity model",
    "summary",
    "markup",
    "view",
    "events",
  ]);
  assert.equal(passed.activityModelOptions.isPosted, isPosted);
  assert.equal(passed.propertySummary.summarizeAccount, summarizeAccount);
  assert.equal(passed.model.propertySummaryModel, propertySummaryModel);
  assert.equal(passed.view.overviewModel, overviewModel);
  assert.equal(passed.events.openPropertyDetails, openPropertyDetails);
  assert.equal(passed.events.openPropertyPayment, openPropertyPayment);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachOverviewEvents",
    "renderOverview",
  ]);
  assert.equal(workflow.renderOverview, renderOverview);
  assert.equal(workflow.attachOverviewEvents, attachEvents);
});

test("profile display updates the shared app shell from the current workspace user", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "profile-display.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map();
  const heading = { firstChild: { textContent: "" } };
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        textContent: "",
        querySelector: () => heading,
      });
    }
    return elements.get(id);
  };
  const feature = context.window.PropertyDeskProfileDisplay.create({
    $,
    state: {
      user: {
        email: "owner@example.test",
        user_metadata: { display_name: "Workspace Owner" },
      },
    },
    now: () => ({
      getHours: () => 14,
      toLocaleDateString: () => "Mon, Oct 5",
    }),
  });

  feature.updateGreeting();

  assert.equal(heading.firstChild.textContent, "Good afternoon");
  assert.equal($("greeting-name").textContent, ", Workspace Owner");
  assert.equal($("user-email").textContent, "Workspace Owner");
  assert.equal($("avatar-initial").textContent, "W");
  assert.equal($("user-menu").textContent, "W");
  assert.equal($("today-label").textContent, "Mon, Oct 5");
});

test("profile display loads before overview and is precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/profile-display.js") <
      html.indexOf("features/overview.js"),
    "profile display should load before dashboard composition",
  );
  assert.ok(
    html.indexOf("features/overview-model.js") <
      html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-events.js") <
        html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-workflow.js") < html.indexOf("app.js"),
    "overview modules should load before the workflow and app",
  );
  assert.match(worker, /'\.\/features\/profile-display\.js'/);
  assert.match(worker, /'\.\/features\/overview-model\.js'/);
  assert.match(worker, /'\.\/features\/overview-events\.js'/);
  assert.match(worker, /'\.\/features\/overview-property-summary-model\.js'/);
  assert.match(worker, /'\.\/features\/overview-view\.js'/);
  assert.match(worker, /'\.\/features\/overview-workflow\.js'/);
});

test("profile settings save the display label and refresh the shared shell", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "profile-settings-view.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "profile-settings.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  const calls = [];
  let saveProfile;
  const elements = {
    "display-name": { value: "  Property Manager  " },
    "display-name-form": {
      addEventListener(eventName, handler) {
        assert.equal(eventName, "submit");
        saveProfile = handler;
      },
    },
  };
  const state = {
    user: { id: "owner-1", user_metadata: { display_name: "Old label" } },
    client: {
      auth: {
        updateUser: async (payload) => {
          calls.push(payload);
          return {
            data: { user: { id: "owner-1", user_metadata: payload.data } },
            error: null,
          };
        },
      },
    },
  };
  const feature = context.window.PropertyDeskProfileSettings.create({
    $: (id) => elements[id],
    state,
    authClient: {
      updateUser: (...args) => state.client.auth.updateUser(...args),
    },
    toast: (message) => messages.push(message),
    updateGreeting: () => calls.push("refresh-greeting"),
  });
  const view = context.window.PropertyDeskProfileSettingsView.create({
    $: (id) => elements[id],
  });

  assert.deepEqual(Object.keys(feature), ["saveProfile"]);
  view.attachEvents(feature.saveProfile);
  await saveProfile({ preventDefault() {} });

  assert.equal(calls[0].data.display_name, "Property Manager");
  assert.equal(calls[1], "refresh-greeting");
  assert.equal(state.user.user_metadata.display_name, "Property Manager");
  assert.deepEqual(messages, ["Display name saved"]);
});
