/* Normalize and validate loan payment allocations during CSV import. */
(() => {
  "use strict";

  const { csvMoney } = globalThis.PropertyDeskCsvValueUtils;
  const roundCurrency = globalThis.PropertyDeskCurrencyUtils?.roundCurrency;
  if (!roundCurrency)
    throw new Error("The shared currency helper is not loaded.");
  const money = globalThis.PropertyDeskDisplayUtils?.money;
  if (!money) throw new Error("The PropertyDesk display helper is not loaded.");
  const allocationColumns = [
    "principal_amount",
    "interest_amount",
    "fee_amount",
    "escrow_amount",
    "unapplied_amount",
  ];

  function hasLegacyPaymentAllocation(row) {
    return allocationColumns.some(
      (column) => String(row[column] ?? "").trim() !== "",
    );
  }

  function paymentAllocation(row, account, amount, paymentDate) {
    if (account.account_type === "rental")
      return { principal: 0, interest: 0, fee: 0, escrow: 0, unapplied: 0 };

    if (!hasLegacyPaymentAllocation(row))
      return {
        principal: 0,
        interest: 0,
        fee: 0,
        escrow: 0,
        unapplied: amount,
      };

    const allocation = {
      principal: csvMoney(
        row.principal_amount,
        `${account.name} principal allocation`,
        { optional: true },
      ),
      interest: csvMoney(
        row.interest_amount,
        `${account.name} interest allocation`,
        { optional: true },
      ),
      fee: csvMoney(row.fee_amount, `${account.name} fee allocation`, {
        optional: true,
      }),
      escrow: csvMoney(row.escrow_amount, `${account.name} escrow allocation`, {
        optional: true,
      }),
      unapplied: csvMoney(
        row.unapplied_amount,
        `${account.name} unapplied allocation`,
        { optional: true },
      ),
    };
    const allocated = Object.values(allocation).reduce(
      (sum, value) => sum + value,
      0,
    );
    if (roundCurrency(allocated) !== roundCurrency(amount))
      throw new Error(
        `Payment allocations for ${account.name} on ${paymentDate} must add up to ${money(amount)}.`,
      );
    return allocation;
  }

  const helpers = Object.freeze({ paymentAllocation });
  globalThis.PropertyDeskPaymentImportAllocation = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
