import tseslint from "@electron-toolkit/eslint-config-ts";
import eslintConfigPrettier from "@electron-toolkit/eslint-config-prettier";
import eslintPluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default tseslint.config(
  { ignores: ["**/node_modules", "**/dist", "**/out"] },
  tseslint.configs.recommended,
  eslintPluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        extraFileExtensions: [".vue"],
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ["**/*.{ts,mts,tsx,vue}"],
    rules: {
      "linebreak-style": "off",
      "vue/require-default-prop": "off",
      "vue/multi-word-component-names": "off",
      "vue/block-lang": [
        "error",
        {
          script: {
            lang: "ts",
          },
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // 关闭一些常见的代码风格警告
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/prefer-template": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "prefer-template": "off",
      "no-empty": "off",
      "vue/valid-template-root": "off",
      "vue/no-required-prop-with-default": "off",
      // 关闭所有格式化和代码风格相关的警告
      indent: "off",
      "object-curly-spacing": "off",
      "comma-dangle": "off",
      semi: "off",
      quotes: "off",
      "space-before-function-paren": "off",
      "function-paren-newline": "off",
      "function-call-argument-newline": "off",
      "array-element-newline": "off",
      "object-property-newline": "off",
      "max-len": "off",
      "brace-style": "off",
      "operator-linebreak": "off",
      "multiline-ternary": "off",
      "implicit-arrow-linebreak": "off",
      "newline-per-chained-call": "off",
      "object-curly-newline": "off",
      "padded-blocks": "off",
      // 彻底关闭所有Prettier和格式化冲突
      "@typescript-eslint/comma-dangle": "off",
      "@typescript-eslint/indent": "off",
      "@typescript-eslint/quotes": "off",
      "@typescript-eslint/semi": "off",
      "@typescript-eslint/space-before-function-paren": "off",
      "@typescript-eslint/member-delimiter-style": "off",
      "@typescript-eslint/type-annotation-spacing": "off",
      "@typescript-eslint/function-call-argument-newline": "off",
      "@typescript-eslint/implicit-arrow-linebreak": "off",
    },
  },
  eslintConfigPrettier,
);
