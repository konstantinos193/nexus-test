import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'build/**'],
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: false,
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
        alert: 'readonly',
        
        // DOM types
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Event: 'readonly',
        Node: 'readonly',
        
        // Web API types
        RequestInit: 'readonly',
        HeadersInit: 'readonly',
        File: 'readonly',
        FileSystemEntry: 'readonly',
        FileSystemFileEntry: 'readonly',
        FileSystemDirectoryEntry: 'readonly',
        FileList: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        crypto: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLImageElement: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        CustomEvent: 'readonly',
        
        // Animation APIs
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        
        // React
        React: 'readonly',
      },
    },
    rules: {
      // Basic TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      
      // React best practices
      'react/jsx-no-useless-fragment': 'warn',
      'react/jsx-boolean-value': 'warn',
      'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
      'react/self-closing-comp': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      
      // General best practices
      'no-console': 'off',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-vars': ['error', { vars: 'all', args: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'arrow-body-style': 'off',
      'prefer-arrow-callback': 'warn',
      'object-shorthand': 'off',
      
      // Code complexity - relaxed thresholds
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'complexity': ['warn', 15],
      'max-depth': ['warn', 6],
      'max-nested-callbacks': ['warn', 5],
      'max-params': ['warn', 6],
      'max-statements': ['warn', 30],
      'no-nested-ternary': 'warn',
    },
  },
  {
    // Override for test files
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'max-lines': 'off',
    },
  },
  {
    // Override for config files
    files: ['**/*.config.{js,ts}', '**/scripts/**'],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
];
