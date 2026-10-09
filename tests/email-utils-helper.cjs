const emailAddressUtils = require("../features/email-address-utils.js");
const reminderCopy = require("../supabase/functions/_shared/reminder-copy.js");
const emailUtilsApi = require("../features/email-utils.js");

module.exports = emailUtilsApi.create({
  modules: { emailAddressUtils, reminderCopy },
});
