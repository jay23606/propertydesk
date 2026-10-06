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
  const feature = context.window.PropertyDeskOverview.create({
    $,
    esc: String,
    prettyKind: String,
    money: (amount) => `$${Number(amount).toFixed(2)}`,
    propertyAddress: (record) => record.address,
    prettyType: String,
    fmtDate: String,
    overviewModel: {
      buildOverview: () => ({
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
      }),
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
});

test("overview workflow composes dashboard rendering with property actions", () => {
  const received = {};
  const modelContext = {
    state: {},
    monthlyScheduledEstimate: () => 0,
    accountBalance: () => 0,
    amountDueSince: () => 0,
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-05",
    collectedSince: () => 0,
    scheduledMonthlyRunRate: () => 0,
    monthStart: () => "2026-10-01",
    isPosted: () => true,
  };
  const viewContext = {
    $: () => {},
    esc: String,
    prettyKind: String,
    money: String,
    propertyAddress: String,
    prettyType: String,
    fmtDate: String,
  };
  const overviewModel = { buildOverview: () => ({}) };
  const openPropertyDetails = () => {};
  const openPropertyPayment = () => {};
  const propertySummaryModel = { summarizeProperty: () => ({}) };
  const context = vm.createContext({
    window: {
      PropertyDeskOverviewPropertySummaryModel: {
        create: (options) => {
          received.propertySummary = options;
          return propertySummaryModel;
        },
      },
      PropertyDeskOverviewModel: {
        create: (options) => {
          received.model = options;
          return overviewModel;
        },
      },
      PropertyDeskOverview: {
        create: (options) => {
          received.view = options;
          return { renderOverview: () => "overview" };
        },
      },
      PropertyDeskOverviewEvents: {
        create: (options) => {
          received.events = options;
          return { attachEvents: () => "overview events" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "overview-workflow.js"),
      "utf8",
    ),
    context,
  );
  const workflow = context.window.PropertyDeskOverviewWorkflow.create({
    ...modelContext,
    ...viewContext,
    openPropertyDetails,
    openPropertyPayment,
  });

  assert.deepEqual(
    Object.keys(received.view).sort(),
    [...Object.keys(viewContext), "overviewModel"].sort(),
  );
  for (const [key, value] of Object.entries(viewContext)) {
    assert.equal(received.view[key], value);
  }
  const propertySummaryKeys = [
    "state",
    "monthlyScheduledEstimate",
    "accountBalance",
    "amountDueSince",
    "unpaidDueAccrualStart",
    "todayIso",
  ];
  assert.deepEqual(
    Object.keys(received.propertySummary).sort(),
    [...propertySummaryKeys].sort(),
  );
  for (const key of propertySummaryKeys) {
    assert.equal(received.propertySummary[key], modelContext[key]);
  }
  assert.deepEqual(
    Object.keys(received.model).sort(),
    [
      "state",
      "propertySummaryModel",
      "collectedSince",
      "scheduledMonthlyRunRate",
      "monthStart",
      "isPosted",
    ].sort(),
  );
  assert.equal(received.model.propertySummaryModel, propertySummaryModel);
  for (const key of [
    "state",
    "collectedSince",
    "scheduledMonthlyRunRate",
    "monthStart",
    "isPosted",
  ])
    assert.equal(received.model[key], modelContext[key]);
  assert.equal(received.view.overviewModel, overviewModel);
  assert.equal(received.events.openPropertyDetails, openPropertyDetails);
  assert.equal(received.events.openPropertyPayment, openPropertyPayment);
  assert.equal(workflow.renderOverview(), "overview");
  assert.equal(workflow.attachOverviewEvents(), "overview events");
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
      html.indexOf("features/overview.js") &&
      html.indexOf("features/overview-model.js") <
        html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview.js") <
        html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-events.js") <
        html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-workflow.js") < html.indexOf("app.js"),
    "overview modules should load before their workflow and the app",
  );
  assert.match(worker, /'\.\/features\/profile-display\.js'/);
  assert.match(worker, /'\.\/features\/overview-model\.js'/);
  assert.match(worker, /'\.\/features\/overview-events\.js'/);
  assert.match(worker, /'\.\/features\/overview-workflow\.js'/);
});

test("profile settings save the display label and refresh the shared shell", async () => {
  const context = vm.createContext({ window: {} });
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
    toast: (message) => messages.push(message),
    updateGreeting: () => calls.push("refresh-greeting"),
  });

  assert.deepEqual(Object.keys(feature), ["attachEvents"]);
  feature.attachEvents();
  await saveProfile({ preventDefault() {} });

  assert.equal(calls[0].data.display_name, "Property Manager");
  assert.equal(calls[1], "refresh-greeting");
  assert.equal(state.user.user_metadata.display_name, "Property Manager");
  assert.deepEqual(messages, ["Display name saved"]);
});
