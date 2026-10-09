const fs = require("node:fs");
const path = require("node:path");
const { parseCSV } = require("../features/csv-parser.js");
require("../features/currency-utils.js");
const csvValueUtils = require("../features/csv-value-utils.js");
const emailAddresses = require("../features/email-address-utils.js");
const domainOptions = require("../features/domain-options.js");
const transactionOptions = require("../features/transaction-options.js");
require("../features/display-utils.js");
const importRows = require("../features/import-row-utils.js");
const identity = require("../features/account-import-identity.js");
const terms = require("../features/account-import-terms.js");
const paymentAllocation = require("../features/payment-import-allocation.js");
const expenseAccountPolicy = require("../features/expense-account-policy.js");
const { selectImportRows } = require("../features/import-row-utils.js");
const accountValidation = require("../features/account-import-validation.js");
const expenseValidation = require("../features/expense-import-validation.js");
const paymentValidation = require("../features/payment-import-validation.js");
const importValidationApi = require("../features/import-validation-api.js");
const importWorkflows = importValidationApi.create({
  account: {
    validator: accountValidation,
    modules: {
      importRows,
      csvValueUtils,
      identity,
      domainOptions,
      terms,
      emailAddresses,
    },
  },
  expense: {
    validator: expenseValidation,
    modules: {
      importRows,
      csvValueUtils,
      transactionOptions,
      expenseAccountPolicy,
    },
  },
  payment: {
    validator: paymentValidation,
    modules: {
      importRows,
      csvValueUtils,
      paymentAllocation,
      transactionOptions,
    },
  },
});

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
  importValidationApi,
  properties,
  accounts,
  readTemplate,
};
