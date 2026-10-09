const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("profile display updates the shared app shell from the current workspace user", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "profile-display.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map();
  const heading = { firstChild: { textContent: "" } };
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        textContent: "",
        querySelector: () => heading,
      });
    }
    return elements.get(id);
  };
  const feature = context.window.PropertyDeskProfileDisplay.create({
    $,
    getUser: () => ({
      email: "owner@example.test",
      user_metadata: { display_name: "Workspace Owner" },
    }),
    now: () => ({
      getHours: () => 14,
      toLocaleDateString: () => "Mon, Oct 5",
    }),
  });

  feature.updateGreeting();

  assert.equal(heading.firstChild.textContent, "Good afternoon");
  assert.equal($("greeting-name").textContent, ", Workspace Owner");
  assert.equal($("user-email").textContent, "Workspace Owner");
  assert.equal($("avatar-initial").textContent, "W");
  assert.equal($("user-menu").textContent, "W");
  assert.equal($("today-label").textContent, "Mon, Oct 5");
});

test("profile display loads before overview and is precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/profile-display.js") <
      html.indexOf("features/overview.js"),
    "profile display should load before dashboard composition",
  );
  assert.ok(
    html.indexOf("features/overview-model.js") <
      html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-events.js") <
        html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-workflow.js") < html.indexOf("app.js"),
    "overview modules should load before the workflow and app",
  );
  assert.match(worker, /'\.\/features\/profile-display\.js'/);
  assert.match(worker, /'\.\/features\/overview-model\.js'/);
  assert.match(worker, /'\.\/features\/overview-events\.js'/);
  assert.match(worker, /'\.\/features\/overview-property-summary-model\.js'/);
  assert.match(worker, /'\.\/features\/overview-view\.js'/);
  assert.match(worker, /'\.\/features\/overview-workflow\.js'/);
});

test("profile settings save the display label and refresh the shared shell", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-write-reconciliation.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-record-write-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-write-feedback.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "profile-settings-view.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "profile-settings.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  const calls = [];
  let saveProfile;
  const elements = {
    "display-name": { value: "  Property Manager  " },
    "display-name-form": {
      addEventListener(eventName, handler) {
        assert.equal(eventName, "submit");
        saveProfile = handler;
      },
    },
  };
  const state = {
    user: { id: "owner-1", user_metadata: { display_name: "Old label" } },
    client: {
      auth: {
        updateUser: async (payload) => {
          calls.push(payload);
          return {
            data: { user: { id: "owner-1", user_metadata: payload.data } },
            error: null,
          };
        },
      },
    },
  };
  const feature = context.window.PropertyDeskProfileSettings.create({
    $: (id) => elements[id],
    getUser: () => state.user,
    setUser: (user) => {
      state.user = user;
    },
    authClient: {
      updateUser: (...args) => state.client.auth.updateUser(...args),
    },
    toast: (message) => messages.push(message),
    run: context.window.PropertyDeskRepositoryWriteFeedback.create({
      modules: {
        reconciliation: context.window.PropertyDeskWorkspaceWriteReconciliation,
        recordWrites: context.window.PropertyDeskWorkspaceRecordWriteWorkflow,
      },
    }).run,
    updateGreeting: () => calls.push("refresh-greeting"),
  });
  const view = context.window.PropertyDeskProfileSettingsView.create({
    $: (id) => elements[id],
  });

  assert.deepEqual(Object.keys(feature), ["saveProfile"]);
  view.attachEvents(feature.saveProfile);
  await saveProfile({ preventDefault() {} });

  assert.equal(calls[0].data.display_name, "Property Manager");
  assert.equal(calls[1], "refresh-greeting");
  assert.equal(state.user.user_metadata.display_name, "Property Manager");
  assert.deepEqual(messages, ["Display name saved"]);
});

test("profile settings confirm a lost update response from the authenticated user", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-write-reconciliation.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-record-write-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-write-feedback.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "profile-settings.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  const calls = [];
  const user = {
    id: "owner-1",
    user_metadata: { display_name: "Property Manager" },
  };
  const state = {
    user: { id: "owner-1", user_metadata: { display_name: "Old label" } },
  };
  const profile = context.window.PropertyDeskProfileSettings.create({
    getUser: () => state.user,
    setUser: (user) => {
      state.user = user;
    },
    authClient: {
      updateUser: async () => {
        throw new Error("connection lost");
      },
      getUser: async () => {
        calls.push("read-back");
        return { data: { user }, error: null };
      },
    },
    toast: (message) => messages.push(message),
    run: context.window.PropertyDeskRepositoryWriteFeedback.create({
      modules: {
        reconciliation: context.window.PropertyDeskWorkspaceWriteReconciliation,
        recordWrites: context.window.PropertyDeskWorkspaceRecordWriteWorkflow,
      },
    }).run,
    updateGreeting: () => calls.push("greeting"),
  });

  await profile.saveProfile("Property Manager");

  assert.equal(state.user, user);
  assert.deepEqual(calls, ["read-back", "greeting"]);
  assert.deepEqual(messages, ["Display name saved"]);
});

test("profile settings show refreshed server state when an uncertain update did not apply", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-write-reconciliation.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-record-write-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-write-feedback.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "profile-settings.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  const actualUser = {
    id: "owner-1",
    user_metadata: { display_name: "Old label" },
  };
  const state = { user: { id: "owner-1" } };
  const profile = context.window.PropertyDeskProfileSettings.create({
    getUser: () => state.user,
    setUser: (user) => {
      state.user = user;
    },
    authClient: {
      updateUser: async () => {
        throw new Error("connection lost");
      },
      getUser: async () => ({ data: { user: actualUser }, error: null }),
    },
    toast: (message) => messages.push(message),
    run: context.window.PropertyDeskRepositoryWriteFeedback.create({
      modules: {
        reconciliation: context.window.PropertyDeskWorkspaceWriteReconciliation,
        recordWrites: context.window.PropertyDeskWorkspaceRecordWriteWorkflow,
      },
    }).run,
    updateGreeting() {},
  });

  await profile.saveProfile("New label");

  assert.equal(state.user, actualUser);
  assert.deepEqual(messages, [
    "Display name was not updated. Your current profile was refreshed; review it before retrying.",
  ]);
});
