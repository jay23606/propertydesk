const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const espree = require("espree");

test("database queries stay inside repository adapters", () => {
  const featureDirectory = path.join(__dirname, "..", "features");
  const featureFiles = fs
    .readdirSync(featureDirectory)
    .filter((file) => file.endsWith(".js"));
  const queryFiles = featureFiles.filter((file) =>
    /\.(from|rpc)\s*\(/u.test(
      fs.readFileSync(path.join(featureDirectory, file), "utf8"),
    ),
  );
  const allowedFiles = new Set([
    "repository-query-utils.js",
    ...featureFiles.filter((file) => file.endsWith("-repository.js")),
  ]);

  for (const file of queryFiles) {
    assert.equal(allowedFiles.has(file), true, file);
  }
});

test("feature factories freeze APIs and keep mutable data containers open", () => {
  const featureDirectory = path.join(__dirname, "..", "features");
  const featureFiles = fs
    .readdirSync(featureDirectory)
    .filter((file) => file.endsWith(".js"));
  const mutableDataFactories = new Set([
    "account-import-identity.js:createContext",
    "app-state.js:createAppState",
  ]);
  const inspectedDataFactories = new Set();
  let inspectedApiBundles = 0;

  for (const file of featureFiles) {
    const source = fs.readFileSync(path.join(featureDirectory, file), "utf8");
    const ast = espree.parse(source, {
      ecmaVersion: "latest",
      sourceType: "script",
      range: true,
    });
    const creators = ast.body
      .filter(
        (statement) =>
          statement.type === "ExpressionStatement" &&
          statement.expression.type === "CallExpression",
      )
      .flatMap((statement) => {
        const root = statement.expression.callee;
        if (
          !["ArrowFunctionExpression", "FunctionExpression"].includes(root.type)
        )
          return [];
        return root.body.body.filter(
          (item) =>
            item.type === "FunctionDeclaration" &&
            item.id.name.startsWith("create"),
        );
      });

    for (const creator of creators) {
      const returnedObjects = [];
      function inspect(node, root = false) {
        if (!node || typeof node !== "object") return;
        if (
          !root &&
          [
            "ArrowFunctionExpression",
            "FunctionExpression",
            "FunctionDeclaration",
          ].includes(node.type)
        )
          return;
        if (node.type === "ReturnStatement" && node.argument) {
          const value = node.argument;
          if (value.type === "ObjectExpression")
            returnedObjects.push({ frozen: false, value });
          else if (
            value.type === "CallExpression" &&
            value.callee.type === "MemberExpression" &&
            value.callee.object.name === "Object" &&
            value.callee.property.name === "freeze" &&
            value.arguments[0]?.type === "ObjectExpression"
          )
            returnedObjects.push({ frozen: true, value: value.arguments[0] });
        }
        for (const [key, value] of Object.entries(node)) {
          if (["loc", "range", "tokens", "comments"].includes(key)) continue;
          if (Array.isArray(value)) value.forEach((child) => inspect(child));
          else if (value && typeof value === "object") inspect(value);
        }
      }
      inspect(creator.body);
      for (const returned of returnedObjects) {
        const factoryName = `${file}:${creator.id.name}`;
        if (mutableDataFactories.has(factoryName)) {
          inspectedDataFactories.add(factoryName);
          assert.equal(returned.frozen, false, factoryName);
          continue;
        }
        inspectedApiBundles += 1;
        assert.equal(returned.frozen, true, factoryName);
      }
    }
  }

  assert.ok(inspectedApiBundles > 0);
  assert.deepEqual(
    [...inspectedDataFactories].sort(),
    [...mutableDataFactories].sort(),
  );
});
