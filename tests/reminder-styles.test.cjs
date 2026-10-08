const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("reminder component and theme rules stay in their feature stylesheet", () => {
  const root = path.join(__dirname, "..");
  const reminders = fs.readFileSync(path.join(root, "reminders.css"), "utf8");
  const theme = fs.readFileSync(path.join(root, "theme.css"), "utf8");

  for (const selector of [
    ".reminder-toggle-row",
    ".reminder-preview-meta",
    ".reminder-preview-body",
    ".reminder-status",
    ".reminder-accepted",
    ".reminder-failed",
    ".reminder-skipped",
    ".reminder-sending",
  ]) {
    assert.ok(
      reminders.includes(selector),
      `${selector} belongs to reminders.css`,
    );
    assert.ok(!theme.includes(selector), `${selector} stays out of theme.css`);
  }
});
