/* Connect overview and Properties portfolio actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      toast,
      fetchAll,
      esc,
      money,
      fmtDate,
      prettyType,
      prettyKind,
      paymentFrequencyLabel,
      monthlyScheduledEstimate,
      accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      propertyAddress,
      openPropertyDetails,
      streetAddress,
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      monthEnd,
      dateOnly,
      isPosted,
      lateReminderMailto,
      paymentStatusInMonth,
      openModal,
      openPayment,
      openPropertyPayment,
      resetAccountForm,
      populateFormOptions,
    } = context;
    const { renderOverview, attachOverviewEvents } =
      window.PropertyDeskOverviewWorkflow.create({
        $,
        state,
        monthlyScheduledEstimate,
        accountBalance,
        amountDueSince,
        unpaidDueAccrualStart,
        todayIso,
        esc,
        prettyKind,
        money,
        propertyAddress,
        collectedSince,
        scheduledMonthlyRunRate,
        monthStart,
        isPosted,
        prettyType,
        fmtDate,
        openPropertyDetails,
        openPropertyPayment,
      });
    const { renderProperties, attachEvents: attachPropertyPortfolioEvents } =
      window.PropertyDeskPropertyPortfolioWorkflow.create({
        $,
        state,
        toast,
        fetchAll,
        esc,
        money,
        paymentFrequencyLabel,
        monthlyScheduledEstimate,
        accountBalance,
        amountDueSince,
        unpaidDueAccrualStart,
        todayIso,
        propertyAddress,
        monthStart,
        streetAddress,
        dateOnly,
        monthEnd,
        lateReminderMailto,
        paymentStatusInMonth,
        openPayment,
        openPropertyDetails,
        resetAccountForm,
        populateFormOptions,
        openModal,
      });

    return {
      renderOverview,
      attachOverviewEvents,
      renderProperties,
      attachPropertyPortfolioEvents,
    };
  }

  window.PropertyDeskPropertyWorkspaceWorkflow = Object.freeze({ create });
})();
