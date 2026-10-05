const globals = require("globals");

module.exports = [
  {
    files: ["app.js", "*.js", "features/**/*.js"],
    ignores: ["eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser, module: "readonly" },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "no-undef": "error",
    },
  },
];
