/* Validate security-deposit adjustments and build their ledger payload. */
(() => {
  "use strict";

  const adjustmentTypes = Object.freeze({
    retained: Object.freeze({
      amountPromptAction: "retained from the deposit",
      successMessage: "Deposit retention recorded",
    }),
    restored: Object.freeze({
      amountPromptAction: "restored to the held balance",
      successMessage: "Deposit retention reversed",
    }),
  });

  function resolveAdjustmentType(type) {
    return adjustmentTypes[type] || null;
  }

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
    if (!resolveAdjustmentType(type)) return { status: "unsupported-type" };
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
    resolveType: resolveAdjustmentType,
    validate: validateDepositAdjustment,
    prepare: prepareDepositAdjustment,
  });
})();
