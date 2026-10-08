/* Connect account detail rendering with its modal actions. */
(() => {
  "use strict";

  function createAccountDetailWorkspaceWorkflow({ content, actions }) {
    const { openAccountDetails } =
      window.PropertyDeskAccountDetailContentWorkflow.create(content);
    const { attachAccountDetailActionEvents } =
      window.PropertyDeskAccountDetailActionWorkflow.create(actions);

    return Object.freeze({
      openAccountDetails,
      attachAccountDetailActionEvents,
    });
  }

  window.PropertyDeskAccountDetailWorkspaceWorkflow = Object.freeze({
    create: createAccountDetailWorkspaceWorkflow,
  });
})();
