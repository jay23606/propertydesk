const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createImportFile(options = {}) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "csv-import-file.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const input = {
    value: "selected.csv",
    addEventListener(event, handler) {
      calls.push(["bind", event]);
      this.handler = handler;
    },
  };
  const status = {
    textContent: "previous result",
    classList: {
      remove(value) {
        calls.push(["remove-class", value]);
      },
    },
  };
  const workflow = context.window.PropertyDeskCsvImportFile.create({
    input,
    status,
    parseCSV: options.parseCSV || ((content) => JSON.parse(content)),
    emptyMessage: "No rows",
    failurePrefix: "Import failed: ",
    handleRows:
      options.handleRows ||
      ((file, rows) => calls.push(["rows", file.name, rows])),
  });
  return { calls, input, status, workflow };
}

test("CSV file workflow parses, stages, and clears a selected file", async () => {
  const { calls, input, status, workflow } = createImportFile();
  workflow.attachEvents();
  await input.handler({
    target: {
      files: [{ name: "accounts.csv", text: async () => '[{"id":1}]' }],
    },
  });

  assert.equal(status.textContent, "");
  assert.equal(input.value, "");
  assert.deepEqual(calls[0], ["bind", "change"]);
  assert.deepEqual(calls[1], ["remove-class", "success"]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[2])), [
    "rows",
    "accounts.csv",
    [{ id: 1 }],
  ]);
});

test("CSV file workflow reports empty, unreadable, and staging failures, then resets", async () => {
  for (const file of [
    { name: "empty.csv", text: async () => "[]" },
    { name: "broken.csv", text: async () => "not-json" },
  ]) {
    const { input, status, workflow } = createImportFile();
    workflow.attachEvents();
    await input.handler({ target: { files: [file] } });
    assert.match(status.textContent, /^Import failed:/);
    assert.equal(input.value, "");
  }

  const { input, status, workflow } = createImportFile({
    parseCSV: () => [{ valid: true }],
    handleRows: () => {
      throw new Error("staging failed");
    },
  });
  workflow.attachEvents();
  await input.handler({
    target: { files: [{ name: "rows.csv", text: async () => "[]" }] },
  });
  assert.equal(status.textContent, "Import failed: staging failed");
  assert.equal(input.value, "");
});
