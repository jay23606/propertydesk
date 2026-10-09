/* Hypothetical loan schedules and recorded principal balance calculations. */
(() => {
  "use strict";

  function createLoanAmortizationUtils({
    monthDateWithAnchor,
    isoDate,
    roundCurrency,
    todayIso,
  }) {
    if (!monthDateWithAnchor || !isoDate || typeof todayIso !== "function")
      throw new Error(
        "Date, currency, and current-date dependencies are required for loan utils.",
      );
    if (!roundCurrency)
      throw new Error("PropertyDeskCurrencyUtils must load before loan utils.");

    function validPrincipalAndTerm(originalPrincipal, termMonths) {
      const principal = Number(originalPrincipal || 0),
        months = Number(termMonths || 0);
      if (
        !Number.isFinite(principal) ||
        principal <= 0 ||
        !Number.isInteger(months) ||
        months <= 0
      )
        return null;
      return { principal, months };
    }

    function monthlyRateFor(annualRate) {
      const rate = Number(annualRate || 0) / 100 / 12;
      return Number.isFinite(rate) && rate >= 0 ? rate : null;
    }

    function paymentForTerms(principal, months, rate, specifiedAmount) {
      const specifiedPayment = Number(specifiedAmount || 0);
      const payment =
        specifiedPayment > 0
          ? specifiedPayment
          : rate
            ? (principal * rate) / (1 - Math.pow(1 + rate, -months))
            : principal / months;
      return Number.isFinite(payment) && payment > 0 ? payment : null;
    }

    function amortizationTerms(
      originalPrincipal,
      annualRate,
      termMonths,
      principalInterestAmount,
    ) {
      const base = validPrincipalAndTerm(originalPrincipal, termMonths);
      if (!base) return null;
      const rate = monthlyRateFor(annualRate);
      if (rate === null) return null;
      const payment = paymentForTerms(
        base.principal,
        base.months,
        rate,
        principalInterestAmount,
      );
      if (payment === null) return null;
      return { ...base, rate, payment };
    }

    function dueDateFormatter(startDate) {
      const anchor = /^\d{4}-\d{2}-\d{2}$/.test(String(startDate || ""))
        ? new Date(`${startDate}T12:00:00`)
        : new Date(`${todayIso()}T12:00:00`);
      return (offset) =>
        isoDate(monthDateWithAnchor(anchor, offset, anchor.getDate()));
    }

    function rowsForTerms({ principal, months, rate, payment }, dueDate) {
      let balance = roundCurrency(principal),
        rows = [];
      for (let i = 1; i <= Math.min(months, 600) && balance > 0.005; i++) {
        const interest = roundCurrency(balance * rate);
        const principalPart = roundCurrency(
          Math.min(balance, Math.max(0, payment - interest)),
        );
        balance = roundCurrency(Math.max(0, balance - principalPart));
        rows.push({
          i,
          date: dueDate(i - 1),
          payment: roundCurrency(interest + principalPart),
          principal: principalPart,
          interest,
          balance,
        });
      }
      return rows;
    }

    function scheduledLoanBalance(account, asOf = todayIso()) {
      if (!account || account.account_type === "rental") return null;
      // This is a hypothetical on-time schedule estimate. Actual receipt history is intentionally ignored.
      const rows = amortizationSchedule(
        account.original_principal,
        account.interest_rate,
        account.term_months,
        account.start_date,
        account.principal_interest_amount,
      );
      const dueRows = rows.filter((row) => row.date <= asOf);
      const base = dueRows.length
        ? dueRows.at(-1).balance
        : Number(account.original_principal || 0);
      return Math.max(
        0,
        roundCurrency(base + Number(account.balance_adjustment || 0)),
      );
    }

    function amortizationSchedule(
      originalPrincipal,
      annualRate,
      termMonths,
      startDate,
      principalInterestAmount = null,
    ) {
      const terms = amortizationTerms(
        originalPrincipal,
        annualRate,
        termMonths,
        principalInterestAmount,
      );
      if (!terms) return [];
      return rowsForTerms(terms, dueDateFormatter(startDate));
    }

    return Object.freeze({
      amortizationSchedule,
      scheduledLoanBalance,
    });
  }

  const loanAmortization = Object.freeze({
    create: createLoanAmortizationUtils,
  });
  globalThis.PropertyDeskLoanAmortizationUtils = loanAmortization;
  if (typeof module !== "undefined" && module.exports)
    module.exports = loanAmortization;
})();
