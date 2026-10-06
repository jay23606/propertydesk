const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRepository() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-repository.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskPropertyRepository;
}

test("property repository inserts and updates the selected property", async () => {
  const calls = [];
  const result = { error: null };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return {
        insert(payload) {
          calls.push(["insert", payload]);
          return result;
        },
        update(payload) {
          calls.push(["update", payload]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return result;
            },
          };
        },
      };
    },
  };
  const repository = loadRepository();

  assert.equal(await repository.save(client, { name: "Home" }), result);
  assert.equal(
    await repository.save(client, { name: "Updated" }, "property-1"),
    result,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["from", "pd_properties"],
    ["insert", { name: "Home" }],
    ["from", "pd_properties"],
    ["update", { name: "Updated" }],
    ["eq", "id", "property-1"],
  ]);
});

test("property repository scopes notes and archive updates by property and owner", async () => {
  const calls = [];
  const result = { error: null };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return {
        update(payload) {
          calls.push(["update", payload]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return {
                eq(ownerColumn, ownerId) {
                  calls.push(["eq", ownerColumn, ownerId]);
                  return result;
                },
              };
            },
          };
        },
      };
    },
  };
  const repository = loadRepository();

  assert.equal(
    await repository.updateOwned(client, "property-1", "owner-1", {
      notes: "Check roof",
    }),
    result,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["from", "pd_properties"],
    ["update", { notes: "Check roof" }],
    ["eq", "id", "property-1"],
    ["eq", "user_id", "owner-1"],
  ]);
});
