const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createWorkspaceQuery(getClient) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "workspace-query.js"), "utf8"),
    context,
  );
  return context.window.PropertyDeskWorkspaceQuery.create({ getClient });
}

test("workspace query pages all rows and stops after the final partial page", async () => {
  const records = Array.from({ length: 1023 }, (_, index) => ({ id: index }));
  const ranges = [];
  const client = {
    from(table) {
      assert.equal(table, "pd_properties");
      const query = {
        select(columns) {
          assert.equal(columns, "*");
          return query;
        },
        range(start, end) {
          ranges.push([start, end]);
          return query;
        },
        then(resolve, reject) {
          const [start, end] = ranges.at(-1);
          return Promise.resolve({
            data: records.slice(start, end + 1),
            error: null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };

  const rows = await createWorkspaceQuery(() => client).loadAllPages(
    "pd_properties",
  );

  assert.equal(rows.length, records.length);
  assert.deepEqual(
    Array.from(rows, ({ id }) => id),
    records.map(({ id }) => id),
  );
  assert.deepEqual(ranges, [
    [0, 499],
    [500, 999],
    [1000, 1499],
  ]);
});

test("workspace query stops paging and throws when a page read fails", async () => {
  const failure = new Error("Page unavailable");
  const client = {
    from() {
      const query = {
        select() {
          return query;
        },
        range() {
          return query;
        },
        then(resolve, reject) {
          return Promise.resolve({ data: null, error: failure }).then(
            resolve,
            reject,
          );
        },
      };
      return query;
    },
  };

  await assert.rejects(
    () => createWorkspaceQuery(() => client).loadAllPages("pd_properties"),
    (error) => error === failure,
  );
});

test("workspace query rejects invalid page sizes before requesting a client", async () => {
  const workspaceQuery = createWorkspaceQuery(() => {
    assert.fail("invalid page size should be rejected first");
  });

  for (const pageSize of [
    0,
    -1,
    1.5,
    Number.NaN,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    await assert.rejects(
      () => workspaceQuery.loadAllPages("pd_properties", pageSize),
      { name: "RangeError", message: "Page size must be a positive integer." },
    );
  }
});
