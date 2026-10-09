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
      modules: { currencyUtils: modules.postedLedger.currencyUtils },
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
    const paymentNotifications = modules.paymentNotifications.create({
      state: runtime.state,
      getClient: runtime.getClient,
      toast,
      money: modules.displayUtils.money,
      propertyAddress: modules.propertyAddressUtils.propertyAddress,
      refresh: runtime.fetchAll,
    });
    const financialContext = modules.financialContext.factory.create({
      state: runtime.state,
      todayIso: modules.dateUtils.todayIso,
      dateUtils: modules.dateUtils,
      currencyUtils: modules.currencyUtils,
      postedLedgerUtils,
      isActiveAccount: modules.accountStatusUtils.isActiveAccount,
      workflows: modules.financialContext.workflows,
    });
    const { depositLedger } = modules.depositContext.factory.create({
      state: runtime.state,
      postedLedgerUtils,
      workflows: modules.depositContext.workflows,
    });

    return Object.freeze({
      writeFeedback,
      emailUtils,
      postedLedgerUtils,
      toast,
      ...runtime,
      paymentNotifications,
      financialContext,
      depositLedger,
    });
  }

  window.PropertyDeskAppServices = Object.freeze({ create: createAppServices });
})();
