/* Compose property lookup, activity, and detail content rendering. */
(() => {
  "use strict";

  function create({
    $,
    beginAuditRequest,
    setSelectedPropertyId,
    getPayments,
    getExpenses,
    getProperties,
    getAccounts,
    getDocuments,
    getWorkspaceMembers,
    getPropertyHolders,
    isPosted,
    sumIncome,
    sumOperatingExpenses,
    money,
    fmtDate,
    esc,
    prettyType,
    paymentFrequencyLabel,
    accountBalance,
    openModal,
    propertyAddress,
    workflows,
  }) {
    const { propertyDocumentsHTML } = workflows.documentsView.create({
      fmtDate,
      esc,
    });
    const { propertyAccountsHTML } = workflows.accountTable.create({
      money,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
    });
    const { propertyDetailsHTML } = workflows.detailsView.create({
      money,
      esc,
      propertyDocumentsHTML,
      propertyAccountsHTML,
    });
    const { renderPropertyActivity } = workflows.activityDetails.create({
      getPayments,
      getExpenses,
      isPosted,
      sumIncome,
      sumOperatingExpenses,
      money,
      fmtDate,
      esc,
      workflows: workflows.activityModules,
    });
    const { buildPropertyDetailData } = workflows.detailsModel.create({
      getProperties,
      getAccounts,
      getDocuments,
      getWorkspaceMembers,
      getPropertyHolders,
      propertyAddress,
    });
    const { openPropertyDetails } = workflows.details.create({
      $,
      beginAuditRequest,
      setSelectedPropertyId,
      money,
      fmtDate,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      openModal,
      buildPropertyDetailData,
      renderPropertyActivity,
      propertyDetailsHTML,
    });

    return Object.freeze({ openPropertyDetails });
  }

  window.PropertyDeskPropertyDetailContentWorkflow = Object.freeze({ create });
})();
