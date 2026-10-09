const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("import validation workflow composes account, payment, and expense rules", () => {
  const calls = [];
  const makeWorkflow = (name, result) => ({
    create(options) {
      calls.push([name, options]);
      return result;
    },
  });
  const csvValueUtils = { csv: true };
  const accountTerms = { terms: true };
  const paymentAllocation = { allocation: true };
  const validators = { validators: true };
  const workflows = {
    csvValueUtils: makeWorkflow("csv", csvValueUtils),
    accountImportTerms: makeWorkflow("terms", accountTerms),
    paymentImportAllocation: makeWorkflow("allocation", paymentAllocation),
    validationApi: makeWorkflow("validators", validators),
  };
  const moduleNames = [
    "currencyUtils",
    "displayUtils",
    "domainOptions",
    "transactionOptions",
    "expenseAccountPolicy",
    "emailAddresses",
    "accountValidation",
    "accountImportIdentity",
    "expenseValidation",
    "paymentValidation",
    "importRows",
  ];
  const modules = Object.fromEntries(moduleNames.map((key) => [key, { key }]));
  modules.currencyUtils.moneyInput = () => {};
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "import-validation-workflow.js"),
      "utf8",
    ),
    context,
  );

  const result = context.window.PropertyDeskImportValidationWorkflow.create({
    workflows,
    modules,
  });

  assert.equal(result.validators, validators);
  assert.deepEqual(
    calls.map(([name]) => name),
    ["csv", "terms", "allocation", "validators"],
  );
  assert.equal(calls[0][1].moneyInput, modules.currencyUtils.moneyInput);
  assert.deepEqual(Object.keys(calls[0][1]), ["moneyInput"]);
  assert.equal(calls[1][1].modules.csvValueUtils, csvValueUtils);
  assert.equal(calls[2][1].modules.csvValueUtils, csvValueUtils);
  assert.equal(calls[3][1].account.modules.terms, accountTerms);
  assert.equal(
    calls[3][1].payment.modules.paymentAllocation,
    paymentAllocation,
  );
  assert.equal(calls[3][1].expense.modules.csvValueUtils, csvValueUtils);
});
