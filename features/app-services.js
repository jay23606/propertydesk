/* Compose shared app services before feature workflows are wired. */
(() => {
  "use strict";

  function createAppServices({ $, config, supabase, reportError, modules }) {
    const writeFeedback = modules.writeFeedback.factory.create({
      modules: {
        reconciliation: modules.writeFeedback.reconciliation,
        recordWrites: modules.writeFeedback.recordWrites,
      },
    });
    const emailUtils = modules.emailUtils.factory.create({
      modules: {
        emailAddressUtils: modules.emailUtils.emailAddressUtils,
        reminderCopy: modules.emailUtils.reminderCopy,
      },
    });
    const postedLedgerUtils = modules.postedLedger.factory.create({
      roundCurrency: modules.postedLedger.currencyUtils.roundCurrency,
    });
    const { toast } = modules.notifications.create({ $ });
    const runtime = modules.workspaceRuntime.factory.create({
      config,
      supabase,
      repositories: modules.workspaceRuntime.repositories,
      toast,
      reportError,
      tables: modules.workspaceRuntime.tables,
      workflows: modules.workspaceRuntime.workflows,
    });
    const stateAccess = modules.stateAccess.create(runtime.state);
    const resetWorkspaceState = () =>
      modules.workspaceRuntime.workflows.appState.resetWorkspaceState(
        runtime.state,
      );
    const paymentNotifications = modules.paymentNotificationSetup.create({
      records: stateAccess.paymentNotifications,
      ui: {
        toast,
        money: modules.displayUtils.money,
        propertyAddress: modules.propertyAddressUtils.propertyAddress,
      },
      services: {
        getClient: runtime.getClient,
        refresh: runtime.fetchAll,
      },
      workflow: modules.paymentNotifications,
    });
    const financialContext = modules.financialContext.factory.create({
      ...stateAccess.financialContext,
      todayIso: modules.dateUtils.todayIso,
      dateUtils: modules.dateUtils,
      currencyUtils: modules.currencyUtils,
      postedLedgerUtils,
      isActiveAccount: modules.accountStatusUtils.isActiveAccount,
      workflows: modules.financialContext.workflows,
    });
    const { depositLedger } = modules.depositContext.factory.create({
      ...stateAccess.depositContext,
      postedLedgerUtils,
      workflows: modules.depositContext.workflows,
    });

    return Object.freeze({
      writeFeedback,
      emailUtils,
      toast,
      backendConfigured: runtime.backendConfigured,
      stateAccess,
      resetWorkspaceState,
      fetchAll: runtime.fetchAll,
      loadAllWorkspacePages: runtime.loadAllWorkspacePages,
      repositories: runtime.repositories,
      setRender: runtime.setRender,
      authClient: runtime.authClient,
      initializeClient: runtime.initializeClient,
      isClientReady: runtime.isClientReady,
      paymentNotifications,
      financialContext,
      depositLedger,
    });
  }

  window.PropertyDeskAppServices = Object.freeze({ create: createAppServices });
})();
