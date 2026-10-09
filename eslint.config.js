const globals = require("globals");
const commonRules = {
  "no-constant-condition": "error",
  "no-dupe-keys": "error",
  "no-redeclare": "error",
  "no-unreachable": "error",
  "no-undef": "error",
  "no-unused-vars": "error",
};

module.exports = [
  {
    files: ["app.js", "*.js", "features/**/*.js"],
    ignores: ["eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser, module: "readonly" },
    },
    rules: { ...commonRules },
  },
  {
    files: ["eslint.config.js", "*.cjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: { ...commonRules },
  },
  {
    files: ["supabase/functions/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    rules: { ...commonRules },
  },
];
