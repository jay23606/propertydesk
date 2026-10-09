/* Connect account detail rendering with its modal actions. */
(() => {
  "use strict";

  function createAccountDetailWorkspaceWorkflow({
    content,
    actions,
    contentWorkflow,
    actionWorkflow,
    actionWorkflows,
  }) {
    const { openAccountDetails } = contentWorkflow.create({
      ...content,
    });
    const { attachAccountDetailActionEvents } = actionWorkflow.create({
      ...actions,
      workflows: actionWorkflows,
    });

    return Object.freeze({
      openAccountDetails,
      attachAccountDetailActionEvents,
    });
  }

  window.PropertyDeskAccountDetailWorkspaceWorkflow = Object.freeze({
    create: createAccountDetailWorkspaceWorkflow,
  });
})();
