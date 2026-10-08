const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("workspace member management styles stay in their feature stylesheet", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const overrides = fs.readFileSync(path.join(root, "overrides.css"), "utf8");
  const workspace = fs.readFileSync(
    path.join(root, "workspace-settings.css"),
    "utf8",
  );
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.ok(
    stylesheetOrder.indexOf("workspace-settings.css") >
      stylesheetOrder.indexOf("overrides.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("workspace-settings.css") <
      stylesheetOrder.indexOf("theme.css"),
  );
  assert.match(workspace, /\.member-form/);
  assert.match(workspace, /\.member-list/);
  assert.match(workspace, /\.member-row/);
  assert.doesNotMatch(overrides, /\.member-(?:form|list|row)/);
});
