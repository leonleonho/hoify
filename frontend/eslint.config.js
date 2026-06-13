// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(// Global ignores
{
  ignores: [
    'dist/',
    'node_modules/',
    '.expo/',
    'assets/',
    'web-build/',
  ],
}, // TypeScript rules for all TS files
...tseslint.configs.recommended, // React plugin config
{
  files: ['**/*.ts', '**/*.tsx'],
  plugins: {
    react: reactPlugin,
    'react-hooks': reactHooksPlugin,
  },
  rules: {
    ...reactPlugin.configs.recommended.rules,
    ...reactHooksPlugin.configs.recommended.rules,
    'react/react-in-jsx-scope': 'off', // Not needed with React 18+
    'react/prop-types': 'off', // Use TypeScript for prop validation
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}, // Custom rules
{
  rules: {
    // Allow unused vars only when prefixed with underscore
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],

    // Allow explicit `any` sparingly — warn rather than error
    '@typescript-eslint/no-explicit-any': 'warn',

    // No explicit return types needed — TypeScript strict mode catches real issues
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // Prefer const over let when variable is never reassigned
    'prefer-const': 'error',

    // No var
    'no-var': 'error',

    // Require triple equals (allow `== null` for null/undefined check)
    'eqeqeq': ['error', 'always', { null: 'ignore' }],

    // No console.log in production code
    'no-console': 'warn',

    // No duplicate imports
    'no-duplicate-imports': 'error',
  },
}, // Override for config files (allow console)
{
  files: [
    'eslint.config.js',
    'babel.config.js',
    'index.ts',
  ],
  rules: {
    'no-console': 'off',
  },
}, storybook.configs["flat/recommended"]);
