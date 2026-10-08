const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("import review styles stay in their feature stylesheet", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const overrides = fs.readFileSync(path.join(root, "overrides.css"), "utf8");
  const imports = fs.readFileSync(path.join(root, "imports.css"), "utf8");
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.ok(
    stylesheetOrder.indexOf("imports.css") >
      stylesheetOrder.indexOf("overrides.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("imports.css") <
      stylesheetOrder.indexOf("theme.css"),
  );
  assert.match(imports, /\.import-preview-table/);
  assert.match(imports, /\.import-preview-errors/);
  assert.match(imports, /\.import-correction-table/);
  assert.doesNotMatch(
    overrides,
    /\.import-(?:preview|history|correction)|\.duplicate-import-/,
  );
});
