/* Normalize and validate account-party contact fields before saving. */
(() => {
  "use strict";

  function partyEmails(value, reminderEnabled) {
    const emails = String(value || "")
      .split(/[;,]/)
      .map((email) => email.trim())
      .filter(Boolean);
    if (emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return { emails, error: "Check each tenant/buyer email address." };
    }
    if (reminderEnabled && !emails.length) {
      return {
        emails,
        error: "Add at least one tenant/buyer email before enabling reminders.",
      };
    }
    return { emails, error: "" };
  }

  window.PropertyDeskAccountFormModel = Object.freeze({ partyEmails });
})();
