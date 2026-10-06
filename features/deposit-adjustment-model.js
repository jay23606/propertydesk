/* Validate security-deposit adjustments and build their ledger payload. */
(() => {
  "use strict";

  function validateDepositAdjustment({ account, amount }) {
    if (!account || account.account_type !== "rental") {
      return { status: "unavailable" };
    }
    if (amount <= 0) return { status: "invalid-amount" };
    return { status: "ready" };
  }

  function prepareDepositAdjustment({
    account,
    userId,
    accountId,
    type,
    amount,
    reason,
    movementDate,
  }) {
    const validation = validateDepositAdjustment({ account, amount });
    if (validation.status !== "ready") return validation;
    if (reason === null) return { status: "cancelled" };
    const auditReason = reason.trim();
    if (!auditReason) return { status: "missing-reason" };

    return {
      status: "ready",
      payload: {
        user_id: userId,
        account_id: accountId,
        entry_type: type,
        amount,
        movement_date: movementDate,
        reason: auditReason,
      },
    };
  }

  window.PropertyDeskDepositAdjustmentModel = Object.freeze({
    validate: validateDepositAdjustment,
    prepare: prepareDepositAdjustment,
  });
})();
