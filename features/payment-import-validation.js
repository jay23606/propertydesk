/* Validate and normalize payment import rows before import review. */
(() => {
  "use strict";

  const {
    createImportLookup,
    duplicateKey,
    duplicateKeyAmount,
    duplicateKeyText,
    resolveImportProperty,
    validateAndMarkDuplicates,
  } = globalThis.PropertyDeskImportRows;
  const { csvMoney, validIsoDate } = globalThis.PropertyDeskCsvValueUtils;
  const { paymentAllocation } = globalThis.PropertyDeskPaymentImportAllocation;
  const {
    incomeCategories,
    paymentMethods,
    defaults: { paymentMethod: defaultPaymentMethod },
  } = globalThis.PropertyDeskTransactionOptions;
  const paymentMethodValues = new Set(paymentMethods.map(({ value }) => value));
  const incomeCategoryValues = {
    rental: new Set(incomeCategories.rental.map(({ value }) => value)),
    loan: new Set(incomeCategories.loan.map(({ value }) => value)),
  };
  function paymentKey(accountId, date, amount, memo) {
    return duplicateKey([
      accountId,
      date,
      duplicateKeyAmount(amount),
      duplicateKeyText(memo),
    ]);
  }

  function paymentAccount(row, lookup) {
    if (
      !row.property_name ||
      !row.property_address ||
      !row.account_name ||
      !row.received_date ||
      !row.amount
    )
      throw new Error(
        "Each payment row needs property_name, property_address, account_name, received_date, and amount.",
      );
    const property = resolveImportProperty(
      row,
      lookup,
      ({ property_name, property_address }) =>
        `Property not found: ${property_name} at ${property_address}. Import properties and accounts first.`,
    );
    const account = lookup.findAccount(property.id, row.account_name);
    if (!account)
      throw new Error(
        `Account not found: ${row.account_name} at ${row.property_name}.`,
      );
    return { property, account };
  }

  function paymentReceiptDetails(row, account) {
    const amount = csvMoney(row.amount, `payment for ${account.name}`, {
        minimum: 0.01,
      }),
      paymentDate = row.received_date;
    if (!validIsoDate(paymentDate))
      throw new Error(`Invalid payment date ${row.received_date}.`);
    const accountCategory =
      account.account_type === "rental" ? "rental" : "loan";
    const incomeCategory =
      row.income_category || incomeCategories[accountCategory][0].value;
    if (!incomeCategoryValues[accountCategory].has(incomeCategory))
      throw new Error(
        `Invalid income category “${incomeCategory}” for ${account.account_type}.`,
      );
    const method = row.payment_method || defaultPaymentMethod;
    if (!paymentMethodValues.has(method))
      throw new Error(`Invalid payment method “${method}”.`);
    return { amount, paymentDate, incomeCategory, method };
  }

  function normalizePaymentRow(row, lookup) {
    const { property, account } = paymentAccount(row, lookup);
    const { amount, paymentDate, incomeCategory, method } =
      paymentReceiptDetails(row, account);
    const allocation = paymentAllocation(row, account, amount, paymentDate);
    return {
      property_name: property.name,
      property_address: property.address,
      account_name: account.name,
      received_date: paymentDate,
      amount,
      income_category: incomeCategory,
      payment_method: method,
      principal_amount: allocation.principal,
      interest_amount: allocation.interest,
      fee_amount: allocation.fee,
      escrow_amount: allocation.escrow,
      unapplied_amount: allocation.unapplied,
      memo: row.memo || "",
    };
  }

  function validatePaymentRows(rows, properties, accounts, payments) {
    const lookup = createImportLookup(properties, accounts);
    const existingKeys = payments.map((x) =>
      paymentKey(x.account_id, x.received_date, x.amount, x.memo),
    );
    return validateAndMarkDuplicates(
      rows,
      existingKeys,
      (row) => normalizePaymentRow(row, lookup),
      (row) => {
        const property = lookup.findExactProperty(
          row.property_name,
          row.property_address,
        );
        const account = lookup.findExactAccount(property?.id, row.account_name);
        return paymentKey(account?.id, row.received_date, row.amount, row.memo);
      },
    );
  }

  const validation = Object.freeze({ validatePaymentRows });
  globalThis.PropertyDeskPaymentImportValidation = validation;
  if (typeof module !== "undefined" && module.exports)
    module.exports = validation;
})();
