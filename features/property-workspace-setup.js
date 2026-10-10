/* Wire overview, portfolio, and property-detail workflows. */
(() => {
  "use strict";

  function createPropertyWorkspaceSetup({ records, ui, services, workflows }) {
    const detail = workflows.detailContextSetup.create({
      records,
      ui,
      services,
      workflows,
    });
    const { editPropertyQuickNote } = workflows.quickNote.workflow.create({
      getProperties: records.getProperties,
      getWorkspaceOwnerId: records.getWorkspaceOwnerId,
      toast: ui.toast,
      fetchAll: services.fetchAll,
      streetAddress: ui.streetAddress,
      promptAction: ui.promptAction,
      repository: {
        updateOwned: services.propertyRepository.updateOwned,
      },
      saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
      noteMaintenance: workflows.quickNote.noteMaintenance,
      recordUpdateMaintenance: workflows.quickNote.recordUpdateMaintenance,
    });

    return workflows.workspace.create({
      groupAccountsByProperty: workflows.groupAccountsByProperty,
      isActiveAccount: workflows.isActiveAccount,
      workflows: {
        overview: workflows.overview,
        portfolio: workflows.portfolio,
      },
      detail,
      overview: {
        $: ui.$,
        getProperties: records.getProperties,
        getAccounts: records.getAccounts,
        getPayments: records.getPayments,
        monthlyScheduledEstimate: ui.monthlyScheduledEstimate,
        summarizeAccount: ui.summarizeAccount,
        collectedSince: ui.collectedSince,
        scheduledMonthlyRunRate: ui.scheduledMonthlyRunRate,
        monthStart: ui.monthStart,
        isPosted: ui.isPosted,
        postedOnOrAfter: ui.postedOnOrAfter,
        esc: ui.esc,
        money: ui.money,
        propertyAddress: ui.propertyAddress,
        prettyKind: ui.prettyKind,
        prettyType: ui.prettyType,
        fmtDate: ui.fmtDate,
        openPropertyPayment: services.openPropertyPayment,
        workflows: workflows.overviewModules,
      },
      portfolio: {
        $: ui.$,
        getSenderName: records.getSenderName,
        getPayments: records.getPayments,
        getPropertyHolders: records.getPropertyHolders,
        getProperties: records.getProperties,
        getAccounts: records.getAccounts,
        getWorkspaceMembers: records.getWorkspaceMembers,
        esc: ui.esc,
        money: ui.money,
        paymentFrequencyLabel: ui.paymentFrequencyLabel,
        monthlyScheduledEstimate: ui.monthlyScheduledEstimate,
        summarizeAccount: ui.summarizeAccount,
        amountDueSince: ui.amountDueSince,
        propertyAddress: ui.propertyAddress,
        streetAddress: ui.streetAddress,
        monthStart: ui.monthStart,
        dateOnly: ui.dateOnly,
        monthEnd: ui.monthEnd,
        lateReminderMailto: ui.lateReminderMailto,
        lateReminderSms: ui.lateReminderSms,
        paymentStatusInMonth: ui.paymentStatusInMonth,
        storage: ui.storage,
        toast: ui.toast,
        openWindow: ui.openWindow,
        schedule: ui.schedule,
        openPayment: services.openPayment,
        openModal: ui.openModal,
        openAccountForProperty: services.openAccountForProperty,
        editAccount: services.editAccount,
        editPropertyQuickNote,
        workflows: workflows.portfolioModules,
      },
    });
  }

  window.PropertyDeskPropertyWorkspaceSetup = Object.freeze({
    create: createPropertyWorkspaceSetup,
  });
})();
