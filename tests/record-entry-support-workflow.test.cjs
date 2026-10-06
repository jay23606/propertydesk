const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app wires modal, form options, and reminder features directly", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  const createOrder = [
    "PropertyDeskModalController.create(",
    "PropertyDeskFormOptions.create(",
    "PropertyDeskReminderActivityModel.create(",
    "PropertyDeskReminderActivityView.create(",
    "PropertyDeskReminderPreview.create(",
  ].map((marker) => app.indexOf(marker));
  assert.ok(createOrder.every((position) => position >= 0));
  assert.deepEqual(
    createOrder,
    [...createOrder].sort((left, right) => left - right),
  );
  assert.match(
    app,
    /PropertyDeskReminderPreview\.create\(\{[\s\S]*?openModal: modal\.openModal/,
  );
  assert.match(app, /attachEvents: attachModalEvents/);
  assert.match(
    app,
    /workspace\.renderWorkspaceSettings\(\);\s*renderReminderActivity\(\);/,
  );
  assert.match(app, /previewReminderEmail,/);
  assert.doesNotMatch(app, /PropertyDeskRecordEntrySupportWorkflow/);

  for (const feature of [
    "features/modal-controller.js",
    "features/form-options.js",
    "features/reminder-activity-model.js",
    "features/reminder-activity-view.js",
    "features/reminder-preview.js",
  ]) {
    assert.ok(
      html.indexOf(feature) >= 0 &&
        html.indexOf(feature) < html.indexOf("app.js"),
      `${feature} loads before app.js`,
    );
    assert.match(worker, new RegExp(`'\\./${feature.replaceAll("/", "\\/")}'`));
  }
  assert.doesNotMatch(html, /record-entry-support-workflow\.js/);
  assert.doesNotMatch(worker, /record-entry-support-workflow\.js/);
});
