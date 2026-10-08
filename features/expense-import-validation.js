/* Validate and normalize expense import rows before import review. */
(() => {
  "use strict";

  const { createImportLookup, markPossibleDuplicates, validateImportRows } =
    globalThis.PropertyDeskImportRows;
  const { csvMoney, validIsoDate } = globalThis.PropertyDeskCsvValueUtils;
  const {
    expenseCategories,
    expensePaymentMethods,
    defaults: {
      expenseImportCategory,
      expensePaymentMethod: defaultPaymentMethod,
    },
  } = globalThis.PropertyDeskTransactionOptions;
  const expenseCategoryValues = new Set(
    expenseCategories.map(({ value }) => value),
  );
  const expensePaymentMethodValues = new Set(
    expensePaymentMethods.map(({ value }) => value),
  );

  function expenseKey(propertyId, accountId, date, amount, payee, memo) {
    return JSON.stringify([
      propertyId,
      accountId || "",
      date,
      Number(amount).toFixed(2),
      String(payee || "")
        .trim()
        .toLowerCase(),
      String(memo || "")
        .trim()
        .toLowerCase(),
    ]);
  }

  function expenseAccountFor(row, property, lookup) {
    if (!row.account_name) return null;

    const account = lookup.findAccount(property.id, row.account_name);
    if (!account)
      throw new Error(
        `Account not found for ${row.property_name}: ${row.account_name}.`,
      );
    return account;
  }

  function expensePropertyAndAccount(row, lookup) {
    if (
      !row.property_name ||
      !row.property_address ||
      !row.expense_date ||
      !row.amount
    )
      throw new Error(
        "Each expense row needs property_name, property_address, expense_date, and amount.",
      );
    const property = lookup.findProperty(
      row.property_name,
      row.property_address,
    );
    if (!property)
      throw new Error(
        `Property not found: ${row.property_name} at ${row.property_address}. Add or import the property first.`,
      );
    const account = expenseAccountFor(row, property, lookup);
    return { property, account };
  }

  function expenseDetails(row, property, account) {
    const amount = csvMoney(row.amount, `expense at ${property.name}`, {
      minimum: 0.01,
    });
    if (!validIsoDate(row.expense_date))
      throw new Error(`Invalid expense date ${row.expense_date}.`);
    const category = row.category || expenseImportCategory,
      method = row.payment_method || defaultPaymentMethod;
    if (!expenseCategoryValues.has(category))
      throw new Error(`Invalid expense category “${category}”.`);
    if (
      !globalThis.PropertyDeskExpenseAccountPolicy.accountMatchesCategory(
        category,
        account,
      )
    )
      throw new Error(
        "A security deposit refund must be linked to a rental account.",
      );
    if (!expensePaymentMethodValues.has(method))
      throw new Error(`Invalid payment method “${method}” for expense.`);
    return { amount, category, method };
  }

  function normalizeExpenseRow(row, lookup) {
    const { property, account } = expensePropertyAndAccount(row, lookup);
    const { amount, category, method } = expenseDetails(row, property, account);
    return {
      property_name: property.name,
      property_address: property.address,
      account_name: account?.name || "",
      expense_date: row.expense_date,
      amount,
      category,
      payee: row.payee || "",
      payment_method: method,
      memo: [row.memo, row.source_note].filter(Boolean).join(" · "),
    };
  }

  function validateExpenseRows(rows, properties, accounts, expenses) {
    const lookup = createImportLookup(properties, accounts);
    const existingKeys = expenses.map((x) =>
      expenseKey(
        x.property_id,
        x.account_id,
        x.expense_date,
        x.amount,
        x.payee,
        x.memo,
      ),
    );
    const validation = validateImportRows(rows, (row) =>
      normalizeExpenseRow(row, lookup),
    );
    const valid = markPossibleDuplicates(
      validation.valid,
      existingKeys,
      (row) => {
        const property = lookup.findExactProperty(
          row.property_name,
          row.property_address,
        );
        const account = row.account_name
          ? lookup.findExactAccount(property?.id, row.account_name)
          : null;
        return expenseKey(
          property?.id,
          account?.id,
          row.expense_date,
          row.amount,
          row.payee,
          row.memo,
        );
      },
    );
    return { ...validation, valid };
  }

  const validation = Object.freeze({ validateExpenseRows });
  globalThis.PropertyDeskExpenseImportValidation = validation;
  if (typeof module !== "undefined" && module.exports)
    module.exports = validation;
})();
