const EMAIL_ENDPOINT = "https://api.mailersend.com/v1/email";

export async function sendReminderEmail({
  token,
  fromEmail,
  fromName,
  recipient,
  message,
  fetchImpl = fetch,
}) {
  return fetchImpl(EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email: recipient }],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
}
