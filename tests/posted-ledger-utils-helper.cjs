const currencyUtils = require("../features/currency-utils.js");

module.exports = require("../features/posted-ledger-utils.js").create({
  modules: { currencyUtils },
});
