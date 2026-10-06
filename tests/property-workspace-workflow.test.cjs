const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property workspace connects details with overview and portfolio actions", () => {
  const calls = [];
  const openPropertyDetails = () => "details";
  const renderOverview = () => "overview";
  const attachOverviewEvents = () => {};
  const renderProperties = () => "properties";
  const attachPropertyPortfolioEvents = () => {};
  const attachPropertyDetailsEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyDetailsWorkflow: {
        create: (options) => {
          calls.push(["details", options]);
          return {
            openPropertyDetails,
            attachEvents: attachPropertyDetailsEvents,
          };
        },
      },
      PropertyDeskOverviewWorkflow: {
        create: (options) => {
          calls.push(["overview", options]);
          return { renderOverview, attachOverviewEvents };
        },
      },
      PropertyDeskPropertyPortfolioScreenWorkflow: {
        create: (options) => {
          calls.push(["portfolio", options]);
          return {
            renderProperties,
            attachEvents: attachPropertyPortfolioEvents,
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );

  const state = { properties: [] };
  const workflow = context.window.PropertyDeskPropertyWorkspaceWorkflow.create({
    state,
    openPropertyPayment: () => {},
    openPayment: () => {},
    openAccountForProperty: () => {},
  });

  assert.deepEqual(
    calls.map(([name]) => name),
    ["details", "overview", "portfolio"],
  );
  assert.equal(calls[0][1].state, state);
  assert.equal(calls[1][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[2][1].openPropertyDetails, openPropertyDetails);
  assert.equal(workflow.openPropertyDetails, openPropertyDetails);
  assert.equal(workflow.renderOverview, renderOverview);
  assert.equal(workflow.attachOverviewEvents, attachOverviewEvents);
  assert.equal(workflow.renderProperties, renderProperties);
  assert.equal(
    workflow.attachPropertyPortfolioEvents,
    attachPropertyPortfolioEvents,
  );
  assert.equal(
    workflow.attachPropertyDetailsEvents,
    attachPropertyDetailsEvents,
  );
});

test("property workspace workflow loads before app and is precached", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.ok(
    html.indexOf("features/property-workspace-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.match(worker, /'\.\/features\/property-workspace-workflow\.js'/);
});
