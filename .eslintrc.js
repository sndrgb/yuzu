module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:node/recommended', 'prettier'],
  env: {
    node: true,
  },
  plugins: ['node', 'prettier'],
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'no-console': 0,
    'node/no-unpublished-require': 0,
    'prettier/prettier': ['error'],
  },
};
