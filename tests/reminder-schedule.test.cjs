const test = require('node:test');
const assert = require('node:assert/strict');

const utilsPromise = import('../supabase/functions/_shared/reminder-schedule.mjs');

test('month-end detection uses New York calendar time, including daylight-saving boundaries', async () => {
  const utils = await utilsPromise;
  assert.equal(utils.isLastCalendarDayInNewYork(new Date('2026-10-31T23:00:00Z')), true);
  assert.equal(utils.isLastCalendarDayInNewYork(new Date('2026-11-01T00:00:00Z')), true, 'still Oct 31 in New York');
  assert.equal(utils.isLastCalendarDayInNewYork(new Date('2026-11-01T05:00:00Z')), false, 'Nov 1 in New York');
  assert.equal(utils.isLastCalendarDayInNewYork(new Date('2024-03-01T02:00:00Z')), true, 'Feb 29 leap day in New York');
  assert.deepEqual(utils.monthWindowInNewYork(new Date('2026-11-01T00:00:00Z')), {
    today: '2026-10-31', monthStart: '2026-10-01', monthEnd: '2026-10-31',
  });
});

test('reminder due calculation follows monthly schedules and carries unpaid amounts from Oct 2026', async () => {
  const utils = await utilsPromise;
  const account = { start_date: '2026-09-05', next_due_date: '2026-11-05', payment_amount: 550, payment_frequency: 'monthly' };
  assert.deepEqual(utils.calculateUnpaidDue(account, '2026-11-01', '2026-11-30', []), { total: 1100, dueThisMonth: 550 });
  assert.deepEqual(utils.calculateUnpaidDue(account, '2026-11-01', '2026-11-30', [
    { status: 'posted', income_category: 'installment', received_date: '2026-10-15', amount: 550 },
  ]), { total: 550, dueThisMonth: 550 });
});

test('only posted rent or installment-like payments in the calendar month suppress reminders', async () => {
  const utils = await utilsPromise;
  const month = '2026-10-01', end = '2026-10-31';
  assert.equal(utils.hasQualifyingPaymentInMonth([{ status: 'posted', income_category: 'rent', received_date: '2026-10-01' }], month, end), true);
  assert.equal(utils.hasQualifyingPaymentInMonth([{ status: 'posted', income_category: 'deposit', received_date: '2026-10-01' }], month, end), false);
  assert.equal(utils.hasQualifyingPaymentInMonth([{ status: 'posted', income_category: 'late_fee', received_date: '2026-10-01' }], month, end), false);
  assert.equal(utils.hasQualifyingPaymentInMonth([{ status: 'voided', income_category: 'installment', received_date: '2026-10-01' }], month, end), false);
  assert.equal(utils.hasQualifyingPaymentInMonth([{ status: 'posted', income_category: 'rent', received_date: '2026-09-30' }], month, end), false);
});

test('recipient parsing deduplicates addresses and rejects invalid entries', async () => {
  const utils = await utilsPromise;
  assert.deepEqual(utils.parseReminderRecipients(' One@example.com; one@example.com, second@example.com; invalid '), [
    'one@example.com', 'second@example.com',
  ]);
});

test('reminder controls remain off by default and the preview stylesheet is in the PWA shell', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const preview = fs.readFileSync(path.join(root, 'features/reminder-preview.js'), 'utf8');
  const forms = fs.readFileSync(path.join(root, 'features/account-form.js'), 'utf8');
  const payload = fs.readFileSync(path.join(root, 'features/account-payload.js'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261004210000_month_end_reminders.sql'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

  assert.match(html, /id="account-reminder-enabled" type="checkbox"/);
  assert.doesNotMatch(html.match(/id="account-reminder-enabled"[^>]*>/)?.[0] || '', /checked/);
  assert.match(forms, /const reminderEnabled = \$\("account-reminder-enabled"\)\.checked/);
  assert.match(forms, /formModel\.partyEmails\(/);
  assert.match(payload, /monthly_reminder_enabled:\s*values\.reminderEnabled/);
  assert.match(migration, /monthly_reminder_enabled boolean not null default false/);
  assert.match(html, /EMAIL PREVIEW · NOTHING SENT/);
  assert.match(app, /PropertyDeskAppShellWorkflow\.create/);
  assert.match(preview, /function previewReminderEmail\(\)[\s\S]*?openModal\("reminder-preview-modal"\)/);
  assert.match(worker, /'\.\/reminders\.css'/);
});
