const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("data transfer workflow connects import and backup export actions", () => {
  const calls = [];
  const attachCsvImportEvents = () => {};
  const attachExportEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskCsvImportWorkflow: {
        create: (options) => {
          calls.push(["import", options]);
          return { attachEvents: attachCsvImportEvents };
        },
      },
      PropertyDeskBackupExport: {
        create: (options) => {
          calls.push(["export", options]);
          return { attachEvents: attachExportEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "data-transfer-workflow.js"),
      "utf8",
    ),
    context,
  );
  const services = { state: { properties: [] }, createBackup: () => ({}) };
  const dependencies = { $: () => {}, ...services };
  const workflow =
    context.window.PropertyDeskDataTransferWorkflow.create(dependencies);

  assert.deepEqual(
    calls.map(([name]) => name),
    ["import", "export"],
  );
  assert.equal(calls[0][1], dependencies);
  assert.equal(calls[1][1], dependencies);
  assert.equal(workflow.attachCsvImportEvents, attachCsvImportEvents);
  assert.equal(workflow.attachExportEvents, attachExportEvents);
});

test("data transfer workflow loads before app and is precached", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.ok(
    html.indexOf("features/data-transfer-workflow.js") < html.indexOf("app.js"),
  );
  assert.match(worker, /'\.\/features\/data-transfer-workflow\.js'/);
});
