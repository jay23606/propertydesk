const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createRefresh({ state, workspaceData, toast, render }) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'features', 'workspace-refresh.js'), 'utf8'),
    context,
  );
  return context.window.PropertyDeskWorkspaceRefresh.create({
    state,
    workspaceData,
    toast,
    render,
  });
}

test('workspace refresh resolves workspace, hydrates state, and rerenders', async () => {
  const client = { rpc: async (name) => ({ data: name === 'pd_workspace_id' ? 'workspace-1' : null, error: null }) };
  const state = { client, properties: [] };
  const calls = [];
  const refresh = createRefresh({
    state,
    workspaceData: {
      loadWorkspaceRecords: async (receivedClient, workspaceId) => {
        calls.push(['load', receivedClient, workspaceId]);
        return { properties: [{ id: 'property-1' }], payments: [] };
      },
    },
    toast: (message) => calls.push(['toast', message]),
    render: () => calls.push(['render']),
  });

  await refresh.fetchAll();

  assert.equal(state.workspaceOwnerId, 'workspace-1');
  assert.equal(state.properties[0].id, 'property-1');
  assert.deepEqual(calls, [
    ['load', client, 'workspace-1'],
    ['render'],
  ]);
});

test('workspace lookup failures show feedback and stop before loading records', async () => {
  const failure = new Error('Workspace lookup failed');
  const calls = [];
  const state = {
    client: { rpc: async () => ({ data: null, error: failure }) },
  };
  const refresh = createRefresh({
    state,
    workspaceData: { loadWorkspaceRecords: async () => calls.push('load') },
    toast: (message) => calls.push(['toast', message]),
    render: () => calls.push('render'),
  });

  await assert.rejects(() => refresh.fetchAll(), (error) => error === failure);
  assert.deepEqual(calls, [['toast', 'Workspace lookup failed']]);
  assert.equal(state.workspaceOwnerId, undefined);
});

test('record loading failures show feedback, rethrow, and skip rendering', async () => {
  const failure = new Error('Records unavailable');
  const calls = [];
  const state = {
    client: { rpc: async () => ({ data: 'workspace-1', error: null }) },
  };
  const refresh = createRefresh({
    state,
    workspaceData: {
      loadWorkspaceRecords: async () => {
        throw failure;
      },
    },
    toast: (message) => calls.push(['toast', message]),
    render: () => calls.push('render'),
  });

  await assert.rejects(() => refresh.fetchAll(), (error) => error === failure);
  assert.equal(state.workspaceOwnerId, 'workspace-1');
  assert.deepEqual(calls, [['toast', 'Records unavailable']]);
});
