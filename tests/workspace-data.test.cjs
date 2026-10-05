const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadModule() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'workspace-data.js'), 'utf8'),
    context,
  );
  return context.window.PropertyDeskWorkspaceData.create();
}

test('workspace data reads every owner table in parallel and maps named results', async () => {
  const requests = [];
  const rpcCalls = [];
  const client = {
    from(table) {
      const operations = [];
      const query = {
        select(columns) {
          operations.push(['select', columns]);
          return query;
        },
        eq(column, value) {
          operations.push(['eq', column, value]);
          return query;
        },
        order(column, options) {
          operations.push(['order', column, options]);
          return query;
        },
        limit(value) {
          operations.push(['limit', value]);
          return query;
        },
        then(resolve, reject) {
          requests.push({ table, operations });
          return Promise.resolve({ data: [table], error: null }).then(
            resolve,
            reject,
          );
        },
      };
      return query;
    },
    rpc(name) {
      rpcCalls.push(name);
      return Promise.resolve({ data: ['member'], error: null });
    },
  };

  const records = await loadModule().loadWorkspaceRecords(
    client,
    'workspace-1',
  );

  assert.equal(records.properties[0], 'pd_properties');
  assert.equal(records.payments[0], 'pd_payments');
  assert.equal(records.workspaceMembers[0], 'member');
  assert.equal(requests.length, 10);
  assert.deepEqual(rpcCalls, ['pd_list_workspace_members']);
  for (const { table, operations } of requests) {
    assert.ok(
      operations.some(
        ([operation, column, value]) =>
          operation === 'eq' && column === 'user_id' && value === 'workspace-1',
      ),
      `${table} should be filtered to the active workspace`,
    );
  }
  assert.ok(
    requests
      .find((request) => request.table === 'pd_reminder_logs')
      .operations.some(
        ([operation, value]) => operation === 'limit' && value === 300,
      ),
  );
});

test('workspace data loading rejects the first database error', async () => {
  const failure = new Error('Database unavailable');
  const client = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        then(resolve, reject) {
          const result =
            table === 'pd_accounts'
              ? { data: null, error: failure }
              : { data: [], error: null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
    rpc: async () => ({ data: [], error: null }),
  };

  await assert.rejects(
    () => loadModule().loadWorkspaceRecords(client, 'workspace-1'),
    (error) => error === failure,
  );
});

test('workspace data module loads before the coordinator and is precached', () => {
  const html = fs.readFileSync(
    path.join(__dirname, '..', 'index.html'),
    'utf8',
  );
  const worker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const services = fs.readFileSync(path.join(__dirname, '..', 'features', 'app-services.js'), 'utf8');

  assert.ok(html.indexOf('workspace-data.js') < html.indexOf('app.js'));
  assert.match(worker, /'\.\/workspace-data\.js'/);
  assert.ok(html.indexOf('features/workspace-refresh.js') < html.indexOf('app.js'));
  assert.match(worker, /'\.\/features\/workspace-refresh\.js'/);
  assert.match(app, /PropertyDeskAppServices\.create\(/);
  assert.match(services, /PropertyDeskWorkspaceData\.create\(\)/);
  assert.match(services, /PropertyDeskWorkspaceRefresh\.create\(/);
});
