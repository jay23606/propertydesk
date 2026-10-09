const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("import workspace supplies configured validators to the import feature", () => {
  const calls = [];
  const validators = { validators: true };
  const feature = { feature: true };
  const dependencies = {
    $() {},
    state: {},
    esc() {},
    openModal() {},
    closeModal() {},
    todayIso() {},
    fetchAll() {},
    toast() {},
    repository: {},
    writeFeedback: {},
    workflows: {
      feature: {
        create(options) {
          calls.push(["feature", options]);
          return feature;
        },
      },
    },
    validationWorkflow: {
      create(options) {
        calls.push(["validation", options]);
        return { validators };
      },
    },
    modules: { csvParser: { parser: true } },
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "import-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );

  const result =
    context.window.PropertyDeskImportWorkspaceWorkflow.create(dependencies);

  assert.equal(result, feature);
  assert.deepEqual(
    calls.map(([name]) => name),
    ["validation", "feature"],
  );
  assert.equal(calls[0][1].modules, dependencies.modules);
  assert.equal(calls[1][1].modules.validators, validators);
  assert.equal(calls[1][1].modules.csvParser, dependencies.modules.csvParser);
  assert.equal(calls[1][1].repository, dependencies.repository);
  assert.equal(calls[1][1].writeFeedback, dependencies.writeFeedback);
});
