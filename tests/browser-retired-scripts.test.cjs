const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("retired workflows stay out of the browser shell and app root", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const retiredScripts = [
    ["features/entry-workflow.js", html],
    ["features/entry-workflow.js", worker],
    ["features/property-portfolio-screen-workflow.js", html],
    ["features/property-portfolio-screen-workflow.js", worker],
    ["features/property-details-workflow.js", html],
    ["features/property-details-workflow.js", worker],
    ["features/reports-workflow.js", html],
    ["features/reports-workflow.js", worker],
    ["features/deposit-details.js", html],
    ["features/deposit-details.js", worker],
    ["record-maintenance.js", worker],
    ["features/reminder-workflow.js", worker],
    ["workspace-settings-workflow.js", worker],
  ];

  for (const [retiredScript, content] of retiredScripts) {
    assert.equal(
      content.includes(retiredScript),
      false,
      "Unexpected retired script: " + retiredScript,
    );
  }
  assert.doesNotMatch(app, /PropertyDesk(?:ImportUtils|ImportWorkflows)\./);
  assert.match(
    app,
    /attachImportPreviewEvents,\s*attachAccountImportEvents,\s*attachPaymentImportEvents,\s*attachExpenseImportEvents,/,
  );
});
