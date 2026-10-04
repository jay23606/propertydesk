const test = require('node:test');
const assert = require('node:assert/strict');
const { lateReminderMailto } = require('../email-utils.js');

function parts(href) {
  const url = new URL(href);
  return { recipients: url.pathname, subject: url.searchParams.get('subject'), body: url.searchParams.get('body') };
}

test('late reminder link addresses the saved party and fills the requested subject and body', () => {
  const href = lateReminderMailto({
    email: 'buyer@example.com',
    address: '117 W Girard St, Mount Carmel, PA 17851',
    unpaidDue: '$550.00',
    senderName: 'Property Manager',
    recipientName: 'Casey Buyer',
    month: 'October 2026',
    asOf: '2026-10-31',
  });

  assert.deepEqual(parts(href), {
    recipients: 'buyer@example.com',
    subject: 'Payment reminder for 117 W Girard St, Mount Carmel, PA 17851 · October 2026',
    body: 'Hello Casey Buyer,\n\nOur records show no rent or installment payment recorded for October 2026.\n\nUnpaid due as of 2026-10-31: $550.00\nProperty: 117 W Girard St, Mount Carmel, PA 17851\n\nIf you have already paid or believe this is incorrect, please contact your landlord or seller.\n\nThank you,\nProperty Manager',
  });
});

test('late reminder link supports multiple validated recipients and leaves missing recipients blank', () => {
  const multiple = parts(lateReminderMailto({ email: 'one@example.com; two@example.com', address: '10 Oak St', unpaidDue: '$75.00', senderName: 'Owner' }));
  assert.equal(multiple.recipients, 'one@example.com,two@example.com');

  const noEmail = parts(lateReminderMailto({ email: 'not-an-email', address: '10 Oak St', unpaidDue: '$75.00', senderName: 'Owner' }));
  assert.equal(noEmail.recipients, '');
  assert.match(noEmail.subject, /^Payment reminder for 10 Oak St · /);
  assert.match(noEmail.body, /^Hello there,\n\nOur records show no rent or installment payment recorded for /);
  assert.match(noEmail.body, /Unpaid due as of \d{4}-\d{2}-\d{2}: \$75\.00\nProperty: 10 Oak St/);
  assert.ok(noEmail.body.endsWith('\n\nThank you,\nOwner'));
});

test('the app renders the account holder as a mailto link instead of an account-details button', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

  assert.match(app, /href="\$\{esc\(reminderHref\)\}"/);
  assert.doesNotMatch(app, /class="table-action" data-detail="\$\{esc\(account\.id\)\}">${esc\(account\.party_name/);
  assert.ok(html.indexOf('email-utils.js') < html.indexOf('app.js'));
  assert.match(worker, /'\.\/email-utils\.js'/);
});
