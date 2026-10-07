const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Pages deployment uses a unique artifact for each workflow attempt", () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", ".github", "workflows", "pages.yml"),
    "utf8",
  );
  const artifactName =
    "github-pages-${{ github.run_id }}-${{ github.run_attempt }}";

  assert.ok(workflow.includes(`name: ${artifactName}`));
  assert.ok(workflow.includes(`artifact_name: ${artifactName}`));
});
