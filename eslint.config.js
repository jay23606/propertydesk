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
      "no-constant-condition": "error",
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
      "no-unused-vars": "error",
    },
  },
  {
    files: ["eslint.config.js", "*.cjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-constant-condition": "error",
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
      "no-unused-vars": "error",
    },
  },
  {
    files: ["supabase/functions/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    rules: {
      "no-constant-condition": "error",
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
      "no-unused-vars": "error",
    },
  },
];
