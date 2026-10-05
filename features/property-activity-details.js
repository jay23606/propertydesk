/* Build property-level cash-flow totals and recent activity. */
(() => {
  "use strict";

  function createPropertyActivityDetails({
    state,
    isPosted,
    sumIncome,
    sumOperatingExpenses,
    money,
    fmtDate,
    esc,
  }) {
    function renderPropertyActivity(propertyId, accounts) {
      const accountIds = new Set(accounts.map((account) => account.id));
      const income = state.payments.filter(
        (payment) => accountIds.has(payment.account_id) && isPosted(payment),
      );
      const accountPayments = state.payments.filter((payment) =>
        accountIds.has(payment.account_id),
      );
      const allExpenses = state.expenses.filter(
        (expense) => expense.property_id === propertyId,
      );
      const expenses = allExpenses.filter(isPosted);
      const incomeTotal = sumIncome(income);
      const expenseTotal = sumOperatingExpenses(expenses);
      const transactions = [
        ...income.map((item) => ({
          date: item.received_date,
          kind:
            item.income_category === "deposit" ? "Security deposit" : "Income",
          label:
            accounts.find((account) => account.id === item.account_id)?.name || "Payment",
          amount: Number(item.amount || 0),
          memo: item.memo,
          status: item.status,
        })),
        ...accountPayments
          .filter((payment) => !isPosted(payment))
          .map((item) => ({
            date: item.received_date,
            kind: "Income · voided",
            label:
              accounts.find((account) => account.id === item.account_id)?.name || "Payment",
            amount: Number(item.amount || 0),
            memo: item.memo,
            status: item.status,
          })),
        ...expenses.map((item) => ({
          date: item.expense_date,
          kind: "Expense",
          label: item.payee || item.category || "Expense",
          amount: -Number(item.amount || 0),
          memo: item.memo,
          status: item.status,
        })),
        ...allExpenses
          .filter((expense) => !isPosted(expense))
          .map((item) => ({
            date: item.expense_date,
            kind: "Expense · voided",
            label: item.payee || item.category || "Expense",
            amount: -Number(item.amount || 0),
            memo: item.memo,
            status: item.status,
          })),
      ]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 8);
      const html = `<div class="detail-section">
        <h3>Recent activity</h3>${
          transactions.length
            ? `<div class="table-wrap property-detail-table">
        <table>
        <thead>
        <tr>
        <th>DATE</th>
        <th>TYPE</th>
        <th>ACCOUNT / DETAILS</th>
        <th>AMOUNT</th>
        </tr>
        </thead>
        <tbody>${transactions
          .map(
            (item) => `<tr class="${item.status === "voided" ? "transaction-voided" : ""}">
        <td>${fmtDate(item.date)}</td>
        <td>${esc(item.kind)}</td>
        <td>${esc(item.label)}${
              item.memo
                ? `<br><span class="muted">${esc(item.memo)}</span>`
                : ""
            }</td>
        <td class="${item.amount < 0 ? "negative-amount" : ""}">${item.amount < 0 ? "−" : ""}${money(Math.abs(item.amount))}</td>
        </tr>`,
          )
          .join("")}</tbody>
        </table>
        </div>`
            : '<p class="list-empty">Recorded income and expenses will appear here.</p>'
        }</div>`;

      return { incomeTotal, expenseTotal, html };
    }

    return { renderPropertyActivity };
  }

  window.PropertyDeskPropertyActivityDetails = Object.freeze({
    create: createPropertyActivityDetails,
  });
})();
