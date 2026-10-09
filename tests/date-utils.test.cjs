const assert = require("node:assert/strict");
const test = require("node:test");
const dates = require("../features/date-utils.js");

test("date-only parsing and display formatting preserve local calendar dates", () => {
  const date = dates.dateOnly("2026-10-05");

  assert.equal(dates.dateOnly(null), null);
  assert.equal(dates.isoDate(date), "2026-10-05");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 5);
  assert.equal(
    dates.fmtDate("2026-10-05"),
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  );
  assert.equal(
    dates.fmtDate("2026-10-05", { year: "numeric" }),
    date.toLocaleDateString(undefined, { year: "numeric" }),
  );
  assert.equal(dates.fmtDate(null), "—");
  assert.equal(
    dates.fmtDateTime("2026-10-05T12:00:00Z"),
    new Date("2026-10-05T12:00:00Z").toLocaleString(),
  );
});

test("today and month boundaries agree with the local calendar", () => {
  const NativeDate = global.Date;
  class FixedDate extends NativeDate {
    constructor(...args) {
      if (args.length) super(...args);
      else super(2024, 1, 29, 23, 59, 0);
    }
  }

  global.Date = FixedDate;
  try {
    assert.equal(dates.todayIso(), "2024-02-29");
    assert.equal(dates.monthStart(), "2024-02-01");
    assert.equal(dates.monthEnd(), "2024-02-29");
  } finally {
    global.Date = NativeDate;
  }
});

test("month offsets preserve anchor days and clamp at month boundaries", () => {
  const jan31LeapYear = new Date(2024, 0, 31, 12);
  const februaryLeapDay = dates.monthDateWithAnchor(jan31LeapYear, 1);
  assert.equal(februaryLeapDay.getFullYear(), 2024);
  assert.equal(februaryLeapDay.getMonth(), 1);
  assert.equal(februaryLeapDay.getDate(), 29);

  const jan31NonLeapYear = new Date(2025, 0, 31, 12);
  const februaryLastDay = dates.monthDateWithAnchor(jan31NonLeapYear, 1);
  assert.equal(februaryLastDay.getFullYear(), 2025);
  assert.equal(februaryLastDay.getMonth(), 1);
  assert.equal(februaryLastDay.getDate(), 28);

  const previousMonth = dates.monthDateWithAnchor(jan31NonLeapYear, -1);
  assert.equal(previousMonth.getFullYear(), 2024);
  assert.equal(previousMonth.getMonth(), 11);
  assert.equal(previousMonth.getDate(), 31);

  const explicitAnchor = dates.monthDateWithAnchor(jan31NonLeapYear, 1, 15);
  assert.equal(explicitAnchor.getDate(), 15);
});
