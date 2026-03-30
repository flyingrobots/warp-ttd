import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      '.obsidian/',
      'dist/',
      '*.mjs',
      '*.js',
      '*.json',
      '*.md',
    ],
  },
  // Inherit the strictest base rulesets available
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ==========================================
      // THE "WHYYY MEEEEE" TIER: TYPESCRIPT BRUTALITY
      // ==========================================

      // Absolutely no `any`. Period.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',

      // You asked for no `unknown`. This is sadistic, but here it is.
      // (Warning: This will make parsing JSON or third-party APIs a living hell).
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            unknown: 'Use a specific type, a type guard, or a branded type. No unknown allowed.'
          }
        }
      ],

      // Enforce strict boundaries and returns. No inferring laziness.
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-member-accessibility': 'error',

      // Nulls and Booleans must be explicit. No implicit truthiness.
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',

      // Switch statements must be mathematically complete.
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // Ban unused vars completely. No ignoring them with an underscore.
      '@typescript-eslint/no-unused-vars': ['error', { args: 'all', caughtErrors: 'all' }],

      // ==========================================
      // THE "CUSTOM ERROR" TIER: NO RAW ERRORS
      // ==========================================

      // Prevent throwing literals (strings, numbers).
      '@typescript-eslint/only-throw-error': 'error',

      // Ban the instantiation of raw `Error`. You must build and use custom Error classes.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'NewExpression[callee.name="Error"]',
          message: 'Zero-slop policy: Do not throw raw Errors. Create and instantiate a custom Error class extending Error.'
        }
      ],

      // ==========================================
      // THE "PEDANTIC" TIER: JAVASCRIPT COMPLEXITY
      // ==========================================

      // Cyclomatic complexity limit. If your function has more than 5 paths, rewrite it.
      'complexity': ['error', 5],

      // Function size limits. Keep it small, keep it readable.
      'max-lines-per-function': ['error', 30],
      'max-depth': ['error', 3], // No massive nested if-statements.
      'max-params': ['error', 3], // Use options objects if you need more than 3 parameters.

      // General pedantry.
      'eqeqeq': ['error', 'always'],
      'no-console': 'error', // Use a real logger.
      'prefer-const': 'error',
      'no-param-reassign': 'error', // Immutability is mandatory.
      'object-shorthand': ['error', 'always'],
    },
  },
  // Test file overrides — Node test runner handles async tests natively
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      'max-lines-per-function': ['error', 50],
    },
  }
);
