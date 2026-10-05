/* Projected rent and installment due dates, separate from posted ledger totals. */
(() => {
  "use strict";
  function createScheduleUtils({ isPosted }) {
    function monthlyScheduledEstimate(accounts) {
      const multipliers = {
        monthly: 1,
        weekly: 52 / 12,
        biweekly: 26 / 12,
        quarterly: 1 / 3,
        annual: 1 / 12,
      };
      const estimate = accounts
        .filter((account) => (account.status || "active") === "active")
        .reduce(
          (sum, account) =>
            sum +
            Number(account.payment_amount || 0) *
              (multipliers[account.payment_frequency] || 1),
          0,
        );
      return Math.round((estimate + Number.EPSILON) * 100) / 100;
    }

    function amountDueSince(accounts, payments, accrualStart, asOf) {
      const start = new Date(`${accrualStart}T12:00:00`),
        asOfDate = new Date(`${asOf}T12:00:00`);
      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(asOfDate.getTime()) ||
        start > asOfDate
      )
        return 0;
      // The current calendar month's installment is assumed unpaid even before its due day.
      const end = new Date(
        asOfDate.getFullYear(),
        asOfDate.getMonth() + 1,
        0,
        12,
      );
      const cents = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
      const interval = {
        monthly: [1, 0],
        weekly: [0, 7],
        biweekly: [0, 14],
        quarterly: [3, 0],
        annual: [12, 0],
      };
      let scheduled = 0;
      for (const account of accounts.filter(
        (item) => (item.status || "active") === "active",
      )) {
        const scheduleStart = new Date(
          `${account.start_date || account.next_due_date}T12:00:00`,
        );
        const nextDue = new Date(
          `${account.next_due_date || account.start_date}T12:00:00`,
        );
        if (
          !Number.isFinite(scheduleStart.getTime()) ||
          !Number.isFinite(nextDue.getTime()) ||
          scheduleStart > asOfDate
        )
          continue;
        const step = interval[account.payment_frequency] || interval.monthly;
        const due = new Date(nextDue);
        const dueDay = nextDue.getDate();
        const lowerBound = scheduleStart > start ? scheduleStart : start;
        let backGuard = 0;
        while (due >= lowerBound && due > scheduleStart && backGuard++ < 1200)
          retreatDueDate(due, step[0], step[1], dueDay);
        let forwardGuard = 0;
        while (due < lowerBound && forwardGuard++ < 1200)
          advanceDueDate(due, step[0], step[1], dueDay);
        let guard = 0;
        while (due <= end && guard++ < 1200) {
          scheduled += Number(account.payment_amount || 0);
          advanceDueDate(due, step[0], step[1], dueDay);
        }
      }
      const accountIds = new Set(accounts.map((item) => item.id));
      const received = payments
        .filter(
          (item) =>
            accountIds.has(item.account_id) &&
            isPosted(item) &&
            !["deposit", "late_fee"].includes(item.income_category) &&
            String(item.received_date || "") >= accrualStart &&
            String(item.received_date || "") <= asOf,
        )
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return cents(Math.max(0, scheduled - received));
    }

    function unpaidDueAccrualStart() {
      // Imported payment histories are incomplete before October 2026, so don't infer older arrears.
      return "2026-10-01";
    }

    function advanceDueDate(date, months, days, anchorDay = date.getDate()) {
      if (days) {
        date.setDate(date.getDate() + days);
        return;
      }
      const first = new Date(
        date.getFullYear(),
        date.getMonth() + months,
        1,
        12,
      );
      const lastDay = new Date(
        first.getFullYear(),
        first.getMonth() + 1,
        0,
        12,
      ).getDate();
      first.setDate(Math.min(anchorDay, lastDay));
      date.setTime(first.getTime());
    }

    function retreatDueDate(date, months, days, anchorDay = date.getDate()) {
      if (days) {
        date.setDate(date.getDate() - days);
        return;
      }
      const first = new Date(
        date.getFullYear(),
        date.getMonth() - months,
        1,
        12,
      );
      const lastDay = new Date(
        first.getFullYear(),
        first.getMonth() + 1,
        0,
        12,
      ).getDate();
      first.setDate(Math.min(anchorDay, lastDay));
      date.setTime(first.getTime());
    }

    return Object.freeze({
      amountDueSince,
      monthlyScheduledEstimate,
      unpaidDueAccrualStart,
    });
  }

  const schedule = Object.freeze({ create: createScheduleUtils });
  globalThis.PropertyDeskScheduleUtils = schedule;
  if (typeof module !== "undefined" && module.exports)
    module.exports = schedule;
})();
