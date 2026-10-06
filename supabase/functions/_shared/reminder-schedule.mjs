export const TRACKING_START = "2026-10-01";

function datePartsInNewYork(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function monthWindowInNewYork(date) {
  const parts = datePartsInNewYork(date);
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    today,
    monthStart: `${parts.year}-${parts.month}-01`,
    monthEnd: today,
  };
}

export function isLastCalendarDayInNewYork(date) {
  const { today } = monthWindowInNewYork(date);
  const [year, month, day] = today.split("-").map(Number);
  return day === new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function advanceCycle(date, frequency, anchorDay, direction) {
  if (frequency === "weekly" || frequency === "biweekly") {
    date.setUTCDate(
      date.getUTCDate() + direction * (frequency === "weekly" ? 7 : 14),
    );
    return;
  }
  const months =
    frequency === "quarterly" ? 3 : frequency === "annual" ? 12 : 1;
  const first = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + direction * months, 1),
  );
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(anchorDay, last));
  date.setTime(first.getTime());
}

export function calculateUnpaidDue(account, monthStart, monthEnd, payments) {
  const scheduleStart = new Date(`${account.start_date}T00:00:00Z`);
  const nextDue = new Date(
    `${account.next_due_date || account.start_date}T00:00:00Z`,
  );
  const accrualDate =
    account.start_date > TRACKING_START ? account.start_date : TRACKING_START;
  const lowerBound = new Date(`${accrualDate}T00:00:00Z`);
  const upperBound = new Date(`${monthEnd}T00:00:00Z`);
  const monthLower = new Date(`${monthStart}T00:00:00Z`);
  if (
    !Number.isFinite(scheduleStart.getTime()) ||
    !Number.isFinite(nextDue.getTime()) ||
    scheduleStart > upperBound
  ) {
    return { total: 0, dueThisMonth: 0 };
  }

  const allowed = ["monthly", "weekly", "biweekly", "quarterly", "annual"];
  const frequency = allowed.includes(account.payment_frequency)
    ? account.payment_frequency
    : "monthly";
  const anchorDay = nextDue.getUTCDate();
  const due = new Date(nextDue);
  let guard = 0;
  while (due > scheduleStart && guard++ < 1200)
    advanceCycle(due, frequency, anchorDay, -1);
  guard = 0;
  while (due < scheduleStart && guard++ < 1200)
    advanceCycle(due, frequency, anchorDay, 1);
  guard = 0;
  while (due < lowerBound && guard++ < 1200)
    advanceCycle(due, frequency, anchorDay, 1);

  const amount = Number(account.payment_amount || 0);
  let scheduled = 0;
  let dueThisMonth = 0;
  guard = 0;
  while (due <= upperBound && guard++ < 1200) {
    scheduled += amount;
    if (due >= monthLower) dueThisMonth += amount;
    advanceCycle(due, frequency, anchorDay, 1);
  }
  const received = payments
    .filter(
      (payment) =>
        payment.status === "posted" &&
        !["deposit", "late_fee"].includes(payment.income_category) &&
        payment.received_date >= TRACKING_START &&
        payment.received_date <= monthEnd,
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const cents = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  return {
    total: cents(Math.max(0, scheduled - received)),
    dueThisMonth: cents(dueThisMonth),
  };
}

export function parseReminderRecipients(value) {
  return [
    ...new Set(
      String(value ?? "")
        .split(/[;,]/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    ),
  ];
}

export function hasQualifyingPaymentInMonth(payments, monthStart, monthEnd) {
  return payments.some(
    (payment) =>
      payment.status === "posted" &&
      !["deposit", "late_fee"].includes(payment.income_category) &&
      payment.received_date >= monthStart &&
      payment.received_date <= monthEnd,
  );
}
