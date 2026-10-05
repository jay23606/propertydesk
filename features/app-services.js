/* Initialize shared backend, workspace, notification, and ledger services. */
(() => {
  "use strict";

  function create({
    $,
    render,
    todayIso,
    scheduledLoanBalance,
    monthlyScheduledEstimate,
    sumPosted,
    securityDepositBalance,
    config = window.PROPERTYDESK_CONFIG || {},
    supabase = window.supabase,
  }) {
    const workspaceData = window.PropertyDeskWorkspaceData.create();
    const backend = window.PropertyDeskBackendClient.create({
      config,
      supabase,
    });
    const state = window.PropertyDeskAppState.create();
    const { toast } = window.PropertyDeskNotifications.create({ $ });
    const { fetchAll } = window.PropertyDeskWorkspaceRefresh.create({
      state,
      workspaceData,
      toast,
      render,
    });
    const ledger = window.PropertyDeskLedgerContext.create({
      state,
      todayIso,
      scheduledLoanBalance,
      monthlyScheduledEstimate,
      sumPosted,
      securityDepositBalance,
    });

    return {
      backend,
      state,
      toast,
      fetchAll,
      accountBalance: ledger.accountBalance,
      scheduledMonthlyRunRate: ledger.scheduledMonthlyRunRate,
      collectedSince: ledger.collectedSince,
      depositLedger: ledger.depositLedger,
    };
  }

  window.PropertyDeskAppServices = Object.freeze({ create });
})();
