/* Compose account, deposit, and transaction maintenance actions. */
(() => {
  "use strict";

  function create({ $, state, moneyInput, todayIso, toast, fetchAll, closeModal }) {
    const { closeAccount } = window.PropertyDeskAccountMaintenance.create({
      $, state, toast, fetchAll, closeModal,
    });
    const { recordDepositAdjustment } = window.PropertyDeskDepositMaintenance.create({
      state, moneyInput, todayIso, toast, fetchAll,
    });
    const { voidTransaction } = window.PropertyDeskTransactionMaintenance.create({
      state, toast, fetchAll,
    });

    return { closeAccount, recordDepositAdjustment, voidTransaction };
  }

  window.PropertyDeskRecordMaintenance = Object.freeze({ create });
})();
