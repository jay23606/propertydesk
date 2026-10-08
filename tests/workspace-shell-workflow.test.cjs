const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace shell connects reminder activity to workspace navigation", () => {
  const calls = [];
  const activityModel = { kind: "activity model" };
  const previewModel = { kind: "preview model" };
  const renderReminderActivity = () => "activity";
  const previewReminderEmail = () => "preview";
  const reminder = {
    $() {},
    state: {},
    esc() {},
    fmtDate() {},
    money() {},
    amountDueSince() {},
    unpaidDueAccrualStart() {},
    monthEnd() {},
    dateOnly() {},
    monthStart() {},
    propertyAddress() {},
    todayIso() {},
    moneyInput() {},
    toast() {},
    openModal() {},
    unusedReminderValue: true,
  };
  const navigation = {
    memberRepository: {},
    documentRef: {},
    windowRef: {},
    unusedDependency: true,
  };
  const context = vm.createContext({
    window: {
      PropertyDeskReminderActivityModel: {
        create(options) {
          calls.push(["activity-model", options]);
          return activityModel;
        },
      },
      PropertyDeskReminderActivityView: {
        create(options) {
          calls.push(["activity-view", options]);
          return { renderReminderActivity };
        },
      },
      PropertyDeskReminderPreviewModel: {
        create(options) {
          calls.push(["preview-model", options]);
          return previewModel;
        },
      },
      PropertyDeskReminderPreview: {
        create(options) {
          calls.push(["preview", options]);
          return { previewReminderEmail };
        },
      },
      PropertyDeskWorkspaceNavigationWorkflow: {
        create(options) {
          calls.push(["navigation", options]);
          return {
            updateGreeting() {},
            attachProfileEvents() {},
            attachWorkspaceMemberEvents() {},
            navigate() {},
            attachNavigationEvents() {},
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-shell-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workflow = context.window.PropertyDeskWorkspaceShellWorkflow.create({
    reminder,
    navigation,
  });

  assert.equal(calls[0][0], "activity-model");
  assert.equal(calls[0][1].state, reminder.state);
  assert.equal(calls[1][0], "activity-view");
  assert.equal(calls[1][1].model, activityModel);
  assert.equal(calls[1][1].$, reminder.$);
  assert.equal(calls[2][0], "preview-model");
  assert.equal(calls[2][1].amountDueSince, reminder.amountDueSince);
  assert.equal(calls[2][1].propertyAddress, reminder.propertyAddress);
  assert.equal(calls[3][0], "preview");
  assert.equal(calls[3][1].model, previewModel);
  assert.equal(calls[3][1].openModal, reminder.openModal);
  assert.equal(calls[4][0], "navigation");
  assert.equal(calls[4][1].documentRef, navigation.documentRef);
  assert.equal(calls[4][1].windowRef, navigation.windowRef);
  assert.equal(calls[4][1].memberRepository, navigation.memberRepository);
  assert.equal("unusedDependency" in calls[4][1], false);
  assert.equal(calls[4][1].renderReminderActivity, renderReminderActivity);
  assert.equal(workflow.previewReminderEmail, previewReminderEmail);
  assert.equal("renderReminderActivity" in workflow, false);
  assert.deepEqual(Object.keys(calls[3][1]).sort(), [
    "$",
    "esc",
    "model",
    "moneyInput",
    "openModal",
    "state",
    "toast",
    "todayIso",
  ]);
  assert.deepEqual(Object.keys(calls[2][1]).sort(), [
    "amountDueSince",
    "dateOnly",
    "money",
    "monthEnd",
    "monthStart",
    "propertyAddress",
    "unpaidDueAccrualStart",
  ]);
  assert.deepEqual(Object.keys(calls[1][1]).sort(), [
    "$",
    "esc",
    "fmtDate",
    "model",
    "money",
  ]);
  assert.deepEqual(Object.keys(calls[4][1]).sort(), [
    "$",
    "authClient",
    "confirmAction",
    "documentRef",
    "esc",
    "fetchAll",
    "memberRepository",
    "renderReminderActivity",
    "state",
    "toast",
    "windowRef",
  ]);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachNavigationEvents",
    "attachProfileEvents",
    "attachWorkspaceMemberEvents",
    "navigate",
    "previewReminderEmail",
    "updateGreeting",
  ]);
});
