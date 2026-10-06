/* Coordinate account history loading and account detail modal state. */
(() => {
  "use strict";

  function createAccountDetails(context) {
    const {
      $,
      state,
      buildAccountDetailData,
      openModal,
      depositSectionHTML,
      renderAccountHistory,
      renderAccountDetails,
      fmtDate,
    } = context;

    async function openAccountDetails(id) {
      const auditRequestId = ++state.auditRequestId;
      const accountData = buildAccountDetailData(id);
      if (!accountData) return;
      const { account, payments, unpaidStart } = accountData;
      const historyHTML = await renderAccountHistory(account, payments);
      if (auditRequestId !== state.auditRequestId) return;

      $("detail-title").textContent = account.name;
      $("detail-content").innerHTML = renderAccountDetails({
        ...accountData,
        unpaidSinceLabel: fmtDate(unpaidStart, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        depositHTML: depositSectionHTML(account),
        historyHTML,
      });
      openModal("detail-modal");
    }

    return { openAccountDetails };
  }

  window.PropertyDeskAccountDetails = Object.freeze({
    create: createAccountDetails,
  });
})();
