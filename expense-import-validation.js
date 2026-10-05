/* Validate and normalize expense import rows before import review. */
(() => {
  'use strict';

  const {
    csvMoney,
    markPossibleDuplicates,
    validIsoDate,
    validateImportRows,
  } = globalThis.PropertyDeskImportUtils;

  function validateExpenseRows(rows, properties, accounts, expenses) {
    const expenseKey = (propertyId, accountId, date, amount, payee, memo) =>
      JSON.stringify([
        propertyId,
        accountId || '',
        date,
        Number(amount).toFixed(2),
        String(payee || '')
          .trim()
          .toLowerCase(),
        String(memo || '')
          .trim()
          .toLowerCase(),
      ]);
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
    const validation = validateImportRows(rows, (row) => {
      if (
        !row.property_name ||
        !row.property_address ||
        !row.expense_date ||
        !row.amount
      )
        throw new Error(
          'Each expense row needs property_name, property_address, expense_date, and amount.',
        );
      const property = properties.find(
        (x) =>
          x.name.toLowerCase() === row.property_name.toLowerCase() &&
          x.address.toLowerCase() === row.property_address.toLowerCase(),
      );
      if (!property)
        throw new Error(
          `Property not found: ${row.property_name} at ${row.property_address}. Add or import the property first.`,
        );
      const account = row.account_name
        ? accounts.find(
            (a) =>
              a.property_id === property.id &&
              a.name.toLowerCase() === row.account_name.toLowerCase(),
          )
        : null;
      if (row.account_name && !account)
        throw new Error(
          `Account not found for ${row.property_name}: ${row.account_name}.`,
        );
      const amount = csvMoney(row.amount, `expense at ${row.property_name}`, {
        minimum: 0.01,
      });
      if (!validIsoDate(row.expense_date))
        throw new Error(`Invalid expense date ${row.expense_date}.`);
      const category = row.category || 'other',
        method = row.payment_method || 'manual';
      if (
        ![
          'repairs',
          'contractor',
          'materials',
          'taxes',
          'insurance',
          'utilities',
          'management',
          'deposit_refund',
          'other',
        ].includes(category)
      )
        throw new Error(`Invalid expense category “${category}”.`);
      if (category === 'deposit_refund' && account?.account_type !== 'rental')
        throw new Error(
          'A security deposit refund must be linked to a rental account.',
        );
      if (
        !['manual', 'check', 'cash', 'bank_transfer', 'card', 'other'].includes(
          method,
        )
      )
        throw new Error(`Invalid payment method “${method}” for expense.`);
      return {
        property_name: property.name,
        property_address: property.address,
        account_name: account?.name || '',
        expense_date: row.expense_date,
        amount,
        category,
        payee: row.payee || '',
        payment_method: method,
        memo: [row.memo, row.source_note].filter(Boolean).join(' · '),
      };
    });
    const valid = markPossibleDuplicates(
      validation.valid,
      existingKeys,
      (row) => {
        const property = properties.find(
            (x) =>
              x.name === row.property_name &&
              x.address === row.property_address,
          ),
          account = row.account_name
            ? accounts.find(
                (x) =>
                  x.property_id === property?.id && x.name === row.account_name,
              )
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
  if (typeof module !== 'undefined' && module.exports)
    module.exports = validation;
})();
