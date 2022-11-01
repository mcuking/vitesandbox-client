module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
    indent: ['error', 2],
    'eol-last': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-multi-spaces': 2,
    'prefer-const': [
      'warn',
      {
        destructuring: 'all'
      }
    ],
  }
};

