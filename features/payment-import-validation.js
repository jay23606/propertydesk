/* Validate and normalize payment import rows before import review. */
(() => {
  "use strict";

  const { createImportLookup, markPossibleDuplicates, validateImportRows } =
    globalThis.PropertyDeskImportRows;
  const { csvMoney, validIsoDate } = globalThis.PropertyDeskCsvValueUtils;
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
  const allocationColumns = [
    "principal_amount",
    "interest_amount",
    "fee_amount",
    "escrow_amount",
    "unapplied_amount",
  ];

  function paymentKey(accountId, date, amount, memo) {
    return JSON.stringify([
      accountId,
      date,
      Number(amount).toFixed(2),
      String(memo || "")
        .trim()
        .toLowerCase(),
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
    const property = lookup.findProperty(
      row.property_name,
      row.property_address,
    );
    if (!property)
      throw new Error(
        `Property not found: ${row.property_name} at ${row.property_address}. Import properties and accounts first.`,
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

  function hasLegacyPaymentAllocation(row) {
    return allocationColumns.some(
      (column) => String(row[column] ?? "").trim() !== "",
    );
  }

  function paymentAllocation(row, account, amount, hasLegacyAllocation) {
    if (account.account_type === "rental")
      return { principal: 0, interest: 0, fee: 0, escrow: 0, unapplied: 0 };
    if (!hasLegacyAllocation)
      return {
        principal: 0,
        interest: 0,
        fee: 0,
        escrow: 0,
        unapplied: amount,
      };
    return {
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
  }

  function validatePaymentAllocation(
    account,
    hasLegacyAllocation,
    allocation,
    amount,
    paymentDate,
  ) {
    if (
      account.account_type !== "rental" &&
      hasLegacyAllocation &&
      Math.round(
        (allocation.principal +
          allocation.interest +
          allocation.fee +
          allocation.escrow +
          allocation.unapplied) *
          100,
      ) !== Math.round(amount * 100)
    )
      throw new Error(
        `Payment allocations for ${account.name} on ${paymentDate} must add up to ${new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)}.`,
      );
  }

  function normalizePaymentRow(row, lookup) {
    const { property, account } = paymentAccount(row, lookup);
    const { amount, paymentDate, incomeCategory, method } =
      paymentReceiptDetails(row, account);
    const hasLegacyAllocation = hasLegacyPaymentAllocation(row);
    const allocation = paymentAllocation(
      row,
      account,
      amount,
      hasLegacyAllocation,
    );
    validatePaymentAllocation(
      account,
      hasLegacyAllocation,
      allocation,
      amount,
      paymentDate,
    );
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
    const validation = validateImportRows(rows, (row) =>
      normalizePaymentRow(row, lookup),
    );
    const valid = markPossibleDuplicates(
      validation.valid,
      existingKeys,
      (row) => {
        const property = lookup.findExactProperty(
          row.property_name,
          row.property_address,
        );
        const account = lookup.findExactAccount(property?.id, row.account_name);
        return paymentKey(account?.id, row.received_date, row.amount, row.memo);
      },
    );
    return { ...validation, valid };
  }

  const validation = Object.freeze({ validatePaymentRows });
  globalThis.PropertyDeskPaymentImportValidation = validation;
  if (typeof module !== "undefined" && module.exports)
    module.exports = validation;
})();
