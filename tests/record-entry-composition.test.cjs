const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("app injects audited correction persistence into record entry directly", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const corrections = app.indexOf(
    "PropertyDeskTransactionMaintenanceWorkflow.create(",
  );
  const recordEntry = app.indexOf("PropertyDeskRecordEntryWorkflow.create(");

  assert.ok(corrections >= 0);
  assert.ok(recordEntry > corrections);
  assert.match(
    app,
    /PropertyDeskTransactionMaintenanceWorkflow\.create\(\{[\s\S]*?closeModal,[\s\S]*?prettyType,[\s\S]*?EventClass: Event,[\s\S]*?OptionClass: Option,/,
  );
  assert.match(
    app,
    /PropertyDeskRecordEntryWorkflow\.create\(\{[\s\S]*?saveCorrection,/,
  );
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.doesNotMatch(html, /features\/ledger-workflow\.js/);
  assert.doesNotMatch(worker, /features\/ledger-workflow\.js/);
  assert.equal(
    fs.existsSync(path.join(root, "features", "ledger-workflow.js")),
    false,
  );
});
