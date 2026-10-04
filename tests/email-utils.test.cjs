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
  });

  assert.deepEqual(parts(href), {
    recipients: 'buyer@example.com',
    subject: 'Late Reminder for 117 W Girard St, Mount Carmel, PA 17851',
    body: 'Unpaid due is $550.00 for 117 W Girard St, Mount Carmel, PA 17851\n\nThank you!\nProperty Manager',
  });
});

test('late reminder link supports multiple validated recipients and leaves missing recipients blank', () => {
  const multiple = parts(lateReminderMailto({ email: 'one@example.com; two@example.com', address: '10 Oak St', unpaidDue: '$75.00', senderName: 'Owner' }));
  assert.equal(multiple.recipients, 'one@example.com,two@example.com');

  const noEmail = parts(lateReminderMailto({ email: 'not-an-email', address: '10 Oak St', unpaidDue: '$75.00', senderName: 'Owner' }));
  assert.equal(noEmail.recipients, '');
  assert.equal(noEmail.subject, 'Late Reminder for 10 Oak St');
  assert.equal(noEmail.body, 'Unpaid due is $75.00 for 10 Oak St\n\nThank you!\nOwner');
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
