/* Compose scoped account history loading with its renderer. */
(() => {
  "use strict";

  function createAccountHistoryDetails({ state, esc, money, fmtDate }) {
    const { loadAccountHistory } =
      window.PropertyDeskAccountHistoryModel.create({ state });
    const { accountHistoryHTML } = window.PropertyDeskAccountHistoryView.create({
      esc, money, fmtDate,
    });

    async function renderAccountHistory(account, payments) {
      const history = await loadAccountHistory(account, payments);
      return accountHistoryHTML(history);
    }

    return { renderAccountHistory };
  }

  window.PropertyDeskAccountHistoryDetails = Object.freeze({
    create: createAccountHistoryDetails,
  });
})();
