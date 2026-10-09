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
    const paymentNotifications = modules.paymentNotifications.create({
      getWorkspaceIdentity: () => ({
        ownerId: runtime.state.workspaceOwnerId,
        viewerId: runtime.state.user?.id,
      }),
      getPaymentNotificationData: () => ({
        members: runtime.state.workspaceMembers.map(
          ({ member_user_id, display_name, email }) => ({
            member_user_id,
            display_name,
            email,
          }),
        ),
        accounts: runtime.state.accounts.map(({ id, property_id }) => ({
          id,
          property_id,
        })),
        properties: runtime.state.properties.map(
          ({ id, address, city, state, postal_code }) => ({
            id,
            address,
            city,
            state,
            postal_code,
          }),
        ),
      }),
      getClient: runtime.getClient,
      toast,
      money: modules.displayUtils.money,
      propertyAddress: modules.propertyAddressUtils.propertyAddress,
      refresh: runtime.fetchAll,
    });
    const financialContext = modules.financialContext.factory.create({
      getAccounts: () => runtime.state.accounts,
      getPayments: () => runtime.state.payments,
      todayIso: modules.dateUtils.todayIso,
      dateUtils: modules.dateUtils,
      currencyUtils: modules.currencyUtils,
      postedLedgerUtils,
      isActiveAccount: modules.accountStatusUtils.isActiveAccount,
      workflows: modules.financialContext.workflows,
    });
    const { depositLedger } = modules.depositContext.factory.create({
      getDepositEntries: () => runtime.state.depositEntries,
      getPayments: () => runtime.state.payments,
      getExpenses: () => runtime.state.expenses,
      postedLedgerUtils,
      workflows: modules.depositContext.workflows,
    });

    return Object.freeze({
      writeFeedback,
      emailUtils,
      toast,
      backendConfigured: runtime.backendConfigured,
      state: runtime.state,
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
