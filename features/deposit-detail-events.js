/* Delegated deposit-ledger actions inside account details. */
(() => {
  "use strict";

  function createDepositDetailEvents({
    $,
    getAccount,
    depositSectionHTML,
    recordDepositAdjustment,
  }) {
    function attachDepositAdjustmentEvents() {
      $("detail-content").addEventListener("click", async (event) => {
        const adjustment = event.target.closest("[data-deposit-adjustment]");
        if (!adjustment) return;

        const { accountId, depositAdjustment } = adjustment.dataset;
        const saved = await recordDepositAdjustment(
          accountId,
          depositAdjustment,
        );
        if (!saved) return;

        const account = getAccount(accountId);
        const section = $("detail-deposit-section");
        if (account && section) section.innerHTML = depositSectionHTML(account);
      });
    }

    return Object.freeze({ attachDepositAdjustmentEvents });
  }

  window.PropertyDeskDepositDetailEvents = Object.freeze({
    create: createDepositDetailEvents,
  });
})();
