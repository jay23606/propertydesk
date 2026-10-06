/* Projected rent and installment due dates, separate from posted ledger totals. */
(() => {
  "use strict";
  function createScheduleUtils({ isPosted }) {
    const monthDateWithAnchor =
      globalThis.PropertyDeskDateUtils?.monthDateWithAnchor;
    if (!monthDateWithAnchor)
      throw new Error("PropertyDeskDateUtils must load before schedule utils.");
    const dueIntervals = {
      monthly: [1, 0],
      weekly: [0, 7],
      biweekly: [0, 14],
      quarterly: [3, 0],
      annual: [12, 0],
    };
    const cents = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

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

    function dueRange(accrualStart, asOf) {
      const start = new Date(`${accrualStart}T12:00:00`),
        asOfDate = new Date(`${asOf}T12:00:00`);
      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(asOfDate.getTime()) ||
        start > asOfDate
      )
        return null;
      const end = new Date(
        asOfDate.getFullYear(),
        asOfDate.getMonth() + 1,
        0,
        12,
      );
      return { start, asOfDate, end };
    }

    function accountScheduleBounds(account, start, asOfDate) {
      const scheduleStart = new Date(
          `${account.start_date || account.next_due_date}T12:00:00`,
        ),
        nextDue = new Date(
          `${account.next_due_date || account.start_date}T12:00:00`,
        );
      if (
        !Number.isFinite(scheduleStart.getTime()) ||
        !Number.isFinite(nextDue.getTime()) ||
        scheduleStart > asOfDate
      )
        return null;
      return {
        scheduleStart,
        nextDue,
        lowerBound: scheduleStart > start ? scheduleStart : start,
      };
    }

    function alignDueDate(due, scheduleStart, lowerBound, step, dueDay) {
      let backGuard = 0;
      while (due >= lowerBound && due > scheduleStart && backGuard++ < 1200)
        retreatDueDate(due, step[0], step[1], dueDay);
      let forwardGuard = 0;
      while (due < lowerBound && forwardGuard++ < 1200)
        advanceDueDate(due, step[0], step[1], dueDay);
    }

    function scheduledAmountForAccount(account, range) {
      const bounds = accountScheduleBounds(
        account,
        range.start,
        range.asOfDate,
      );
      if (!bounds) return 0;
      const step =
        dueIntervals[account.payment_frequency] || dueIntervals.monthly;
      const due = new Date(bounds.nextDue);
      const dueDay = bounds.nextDue.getDate();
      alignDueDate(due, bounds.scheduleStart, bounds.lowerBound, step, dueDay);
      let scheduled = 0,
        guard = 0;
      while (due <= range.end && guard++ < 1200) {
        scheduled += Number(account.payment_amount || 0);
        advanceDueDate(due, step[0], step[1], dueDay);
      }
      return scheduled;
    }

    function scheduledDues(accounts, range) {
      return accounts
        .filter((account) => (account.status || "active") === "active")
        .reduce(
          (sum, account) => sum + scheduledAmountForAccount(account, range),
          0,
        );
    }

    function receivedPayments(accounts, payments, accrualStart, asOf) {
      const accountIds = new Set(accounts.map((item) => item.id));
      return payments
        .filter(
          (item) =>
            accountIds.has(item.account_id) &&
            isPosted(item) &&
            !["deposit", "late_fee"].includes(item.income_category) &&
            String(item.received_date || "") >= accrualStart &&
            String(item.received_date || "") <= asOf,
        )
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }

    function amountDueSince(accounts, payments, accrualStart, asOf) {
      const range = dueRange(accrualStart, asOf);
      if (!range) return 0;
      const scheduled = scheduledDues(accounts, range);
      const received = receivedPayments(accounts, payments, accrualStart, asOf);
      return cents(Math.max(0, scheduled - received));
    }

    function unpaidDueAccrualStart() {
      // Imported payment histories are incomplete before October 2026, so don't infer older arrears.
      return "2026-10-01";
    }

    function shiftDueDate(date, months, days, anchorDay, direction) {
      if (days) {
        date.setDate(date.getDate() + days * direction);
        return;
      }
      date.setTime(
        monthDateWithAnchor(date, months * direction, anchorDay).getTime(),
      );
    }

    function advanceDueDate(date, months, days, anchorDay = date.getDate()) {
      shiftDueDate(date, months, days, anchorDay, 1);
    }

    function retreatDueDate(date, months, days, anchorDay = date.getDate()) {
      shiftDueDate(date, months, days, anchorDay, -1);
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
