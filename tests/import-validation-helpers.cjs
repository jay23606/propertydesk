const fs = require("node:fs");
const path = require("node:path");
const { parseCSV } = require("../features/csv-parser.js");
require("../features/money-input-utils.js");
require("../features/csv-value-utils.js");
require("../features/email-address-utils.js");
require("../features/import-row-utils.js");
require("../features/account-import-identity.js");
require("../features/payment-import-allocation.js");
require("../features/domain-options.js");
require("../features/transaction-options.js");
require("../features/expense-account-policy.js");
const { selectImportRows } = require("../features/import-row-utils.js");
require("../features/account-import-validation.js");
require("../features/expense-import-validation.js");
require("../features/payment-import-validation.js");
const importWorkflows = require("../features/import-validation-api.js");

const properties = [{ id: "p1", name: "Oak House", address: "10 Oak St" }];
const accounts = [
  { id: "r1", property_id: "p1", name: "Oak Rental", account_type: "rental" },
  {
    id: "n1",
    property_id: "p1",
    name: "Oak Contract",
    account_type: "land_contract",
  },
];

function readTemplate(name) {
  return fs.readFileSync(path.join(__dirname, "..", "templates", name), "utf8");
}

module.exports = {
  parseCSV,
  selectImportRows,
  validateAccountRows: importWorkflows.validateAccountRows,
  validateExpenseRows: importWorkflows.validateExpenseRows,
  validatePaymentRows: importWorkflows.validatePaymentRows,
  importWorkflows,
  properties,
  accounts,
  readTemplate,
};
