import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

let rules = {
  eqeqeq: "error",
  "no-unused-vars": "error",
  "no-self-compare": "error",
  "no-useless-assignment": "error",
  "camelcase": "error",
  "no-array-constructor": "error",
  "no-eval": "error",
  "no-implied-eval": "error",
  "no-invalid-this": "error",
  "no-shadow": "error",
  "no-unneeded-ternary": "error",
  "no-var": "error",
};

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser }, rules },
  { files: ["**/*.js"], languageOptions: { sourceType: "script" } },
]);
