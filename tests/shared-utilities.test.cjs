const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("date, display, and money-input utilities preserve their shared contracts", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "domain-options.js"),
      "utf8",
    ),
    context,
  );
  for (const filename of [
    "transaction-options.js",
    "date-utils.js",
    "display-utils.js",
    "currency-utils.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const dates = context.window.PropertyDeskDateUtils;
  const display = context.window.PropertyDeskDisplayUtils;
  const currency = context.window.PropertyDeskCurrencyUtils;

  assert.match(display.money(12), /12\.00/);
  assert.equal(display.esc(`<a x="'">&`), "&lt;a x=&quot;&#39;&quot;&gt;&amp;");
  assert.equal(currency.moneyInput("$1,234.567"), 1234.57);
  assert.equal(currency.moneyInput("(15.50)"), -15.5);
  assert.equal(currency.moneyInput("not a number"), 0);
  assert.equal(currency.roundCurrency(1.005), 1.01);
  assert.equal(display.prettyType("land_contract"), "Land contract");
  assert.equal(display.prettyKind("residential"), "Residential");
  assert.equal(display.paymentFrequencyLabel("biweekly"), "Every 2 weeks");
  assert.equal(display.paymentFrequencyLabel("unknown"), "Monthly");
  assert.equal(
    display.expenseCategoryLabel("deposit_refund"),
    "Security deposit refund",
  );
  assert.equal(
    display.expenseCategoryLabel("contractor_labor"),
    "contractor labor",
  );
  assert.equal(dates.dateOnly("2026-10-05").getDate(), 5);
  assert.equal(dates.fmtDate(null), "—");
  assert.match(dates.todayIso(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(dates.monthStart(), /^\d{4}-\d{2}-01$/);
  assert.match(dates.monthEnd(), /^\d{4}-\d{2}-\d{2}$/);
});

test("form options are populated from shared domain and transaction catalogs", () => {
  const context = vm.createContext({
    window: {},
    Object,
    Map,
  });
  for (const filename of [
    "domain-options.js",
    "transaction-options.js",
    "form-options.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, { innerHTML: "" });
    return elements.get(id);
  };
  context.window.PropertyDeskFormOptions.create({
    $,
    state: { properties: [], accounts: [] },
    esc: String,
    propertyAddress: String,
    prettyType: String,
  });

  assert.match($("account-type").innerHTML, /value="land_contract"/);
  assert.match($("account-frequency").innerHTML, /Every two weeks/);
  assert.match($("property-kind").innerHTML, /value="commercial"/);
  assert.match($("payment-method").innerHTML, /value="money_order"/);
  assert.match($("income-category").innerHTML, /Other income/);
  assert.match($("expense-category").innerHTML, /Security deposit refund/);
  assert.doesNotMatch($("expense-method").innerHTML, /value="money_order"/);
  assert.doesNotMatch($("expense-method").innerHTML, /value="other"/);
});

test("property address utilities format full and street addresses", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-address-utils.js"),
      "utf8",
    ),
    context,
  );
  const utils = context.window.PropertyDeskPropertyAddressUtils;

  assert.equal(
    utils.propertyAddress({
      address: "10 Main St",
      city: "Altoona",
      state: "PA",
      postal_code: "16601",
    }),
    "10 Main St, Altoona, PA, 16601",
  );
  assert.equal(
    utils.propertyLocation({ city: "Altoona", state: "PA" }),
    "Altoona, PA",
  );
  assert.equal(
    utils.streetAddress({ address: "10 Main St, Altoona, PA" }),
    "10 Main St",
  );
});
