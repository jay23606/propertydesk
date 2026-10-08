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
  assert.ok(workflow.includes("actions: read"));
  const upload = workflow.indexOf("uses: actions/upload-pages-artifact@v5");
  const wait = workflow.indexOf(
    "Wait for uploaded Pages artifact to become visible",
  );
  const deploy = workflow.indexOf("uses: actions/deploy-pages@v5");
  assert.ok(upload >= 0 && upload < wait && wait < deploy);
  assert.ok(workflow.includes('GITHUB_RUN_ID}/artifacts"'));
  assert.ok(workflow.includes("sleep 5"));
  assert.ok(workflow.includes("visible_attempts=0"));
  assert.ok(workflow.includes('"$visible_attempts" -ge 3'));
  assert.ok(workflow.includes("three consecutive checks"));
});
