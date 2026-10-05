/* PropertyDesk transaction and report views. */
(() => {
  "use strict";

  function createTransactionViews(context) {
    const {
      $,
      state,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      isPosted,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
    } = context;

    function renderTransactionRow(record) {
      const item = record.item;
      const isExpense = record.kind === "expense";
      const isVoided = item.status === "voided";
      const account = state.accounts.find((row) => row.id === item.account_id);
      const property = isExpense
        ? state.properties.find((row) => row.id === item.property_id)
        : state.properties.find((row) => row.id === account?.property_id);
      const correctionOf = isExpense
        ? item.correction_of_expense_id
        : item.correction_of_payment_id;
      const transactionType = isExpense
        ? "Expense"
        : item.income_category === "deposit"
          ? "Security deposit"
          : "Income";
      const detailsType = isExpense
        ? expenseCategoryLabel(item.category)
        : account?.account_type === "rental"
          ? item.income_category
          : "Installment receipt";
      const paymentMethod = isExpense
        ? item.payee || item.payment_method
        : item.payment_method.replace("_", " ");
      const actionButtons = isVoided
        ? '<span class="muted">Voided</span>'
        : `<button type='button' class='text-button' data-correct-transaction data-kind='${record.kind}' data-id='${esc(item.id)}'>Correct</button> <button type='button' class='text-button' data-void-transaction data-kind='${record.kind}' data-id='${esc(item.id)}'>Void</button>`;

      return `<tr class='${isVoided ? "transaction-voided" : ""}'>
        <td>${fmtDate(record.date)}</td>
        <td><span class='${isExpense ? "expense-pill" : "status-pill"}'>${transactionType}${isVoided ? " · voided" : ""}</span></td>
        <td><strong>${esc(property?.name || "—")}</strong><br>${esc(account?.party_name || account?.name || "Property")}</td>
        <td>${esc(detailsType)}</td>
        <td><strong>${isExpense ? "−" : ""}${money(record.amount)}</strong></td>
        <td>${esc(paymentMethod)}</td>
        <td>${esc(item.memo || "—")}${item.void_reason ? `<small class='table-subtext'>${esc(item.void_reason)}</small>` : ""}${correctionOf ? '<small class="table-subtext">Corrected replacement</small>' : ""}</td>
        <td>${actionButtons}</td>
      </tr>`;
    }

    function renderPayments() {
      const period = $("payment-period").value,
        q = $("payment-search").value.trim().toLowerCase(),
        now = new Date(),
        type = $("transaction-type").value;
      const rows = [
        ...state.payments.map((item) => ({
          kind: "income",
          date: item.received_date,
          amount: Number(item.amount),
          item,
        })),
        ...state.expenses.map((item) => ({
          kind: "expense",
          date: item.expense_date,
          amount: Number(item.amount),
          item,
        })),
      ]
        .filter(
          (x) =>
            (type === "all" || type === x.kind) &&
            (period === "all" ||
              (period === "month" &&
                dateOnly(x.date)?.getMonth() === now.getMonth() &&
                dateOnly(x.date)?.getFullYear() === now.getFullYear()) ||
              (period === "year" &&
                dateOnly(x.date)?.getFullYear() === now.getFullYear())),
        )
        .filter((x) => {
          const a = state.accounts.find((z) => z.id === x.item.account_id),
            p =
              x.kind === "expense"
                ? state.properties.find((z) => z.id === x.item.property_id)
                : state.properties.find((z) => z.id === a?.property_id);
          return (
            !q ||
            `${a?.name || ""} ${a?.party_name || ""} ${p?.name || ""} ${x.item.memo || ""} ${x.item.payee || ""}`
              .toLowerCase()
              .includes(q)
          );
        })
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      $("payments-table").innerHTML = rows
        .map((x) => {
          const item = x.item,
            exp = x.kind === "expense",
            voided = item.status === "voided",
            a = state.accounts.find((z) => z.id === item.account_id),
            p = exp
              ? state.properties.find((z) => z.id === item.property_id)
              : state.properties.find((z) => z.id === a?.property_id),
            correctionOf = exp
              ? item.correction_of_expense_id
              : item.correction_of_payment_id;
          return renderTransactionRow(x);
        })
        .join("");
      $("payments-empty").classList.toggle("hidden", rows.length > 0);
      if (!rows.length)
        $("payments-empty").textContent = "No transactions match this view.";
      const monthPayments = state.payments.filter(
          (p) => isPosted(p) && String(p.received_date) >= monthStart(),
        ),
        monthExpenses = state.expenses.filter(
          (x) => String(x.expense_date) >= monthStart() && isPosted(x),
        ),
        income = sumIncome(monthPayments),
        expenses = sumOperatingExpenses(monthExpenses);
      $("payments-collected").textContent = money(income);
      $("expenses-total").textContent = money(expenses);
      $("net-cash-flow").textContent = money(income - expenses);
    }
    function renderReports() {
      const y = new Date().getFullYear(),
        yearPayments = state.payments.filter(
          (p) => dateOnly(p.received_date)?.getFullYear() === y,
        ),
        income = sumIncome(yearPayments),
        costs = sumOperatingExpenses(
          state.expenses.filter(
            (p) => dateOnly(p.expense_date)?.getFullYear() === y,
          ),
        );
      $("report-ytd").textContent = money(income);
      $("report-expenses-ytd").textContent = money(costs);
      $("report-net-ytd").textContent = money(income - costs);
      $("report-principal").textContent = money(
        state.accounts
          .filter((a) => a.account_type !== "rental")
          .reduce((s, a) => s + accountBalance(a), 0),
      );
      const labels = [
        ["rental", "Rentals"],
        ["land_contract", "Land contracts"],
        ["note", "Private notes"],
      ];
      const counts = labels.map(
          ([k]) => state.accounts.filter((a) => a.account_type === k).length,
        ),
        max = Math.max(1, ...counts);
      $("account-breakdown").innerHTML = labels
        .map(
          ([key, label], i) =>
            `<div class="breakdown-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${(counts[i] / max) * 100}%"></div></div><strong>${counts[i]}</strong></div>`,
        )
        .join("");
      $("import-history").innerHTML = state.importBatches.length
        ? state.importBatches
            .map(
              (batch) =>
                `<tr><td><strong>${esc(batch.source_name || "CSV import")}</strong></td><td>${esc(batch.source_type)}</td><td>${esc(new Date(batch.created_at).toLocaleString())}</td><td>${Number(batch.rows_accepted)} of ${Number(batch.rows_total)}</td><td><span class="status-pill">${esc(batch.status)}</span></td></tr>`,
            )
            .join("")
        : '<tr><td colspan="5" class="muted">Completed imports will appear here.</td></tr>';
    }

    return { renderPayments, renderReports };
  }

  window.PropertyDeskTransactionViews = Object.freeze({
    create: createTransactionViews,
  });
})();
