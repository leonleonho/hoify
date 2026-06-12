import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      'music/',
    ],
  },

  // TypeScript rules for all TS files
  ...tseslint.configs.recommended,

  // Custom rules
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
  },

  // Override for test files
  {
    files: ['src/__tests__/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Override for server entry point
  {
    files: ['src/index.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
