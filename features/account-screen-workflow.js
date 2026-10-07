/* Compose account detail content with account and deposit actions. */
(() => {
  "use strict";

  function createAccountScreenWorkflow({ content, maintenance }) {
    const details =
      window.PropertyDeskAccountDetailContentWorkflow.create(content);
    const actions = window.PropertyDeskAccountDepositMaintenanceWorkflow.create(
      {
        ...maintenance,
        depositSectionHTML: details.depositSectionHTML,
      },
    );

    return { ...details, ...actions };
  }

  window.PropertyDeskAccountScreenWorkflow = Object.freeze({
    create: createAccountScreenWorkflow,
  });
})();
