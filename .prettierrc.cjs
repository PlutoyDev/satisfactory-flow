/** @type {import('prettier').Config} */
module.exports = {
  arrowParens: 'avoid',
  printWidth: 140,
  singleQuote: true,
  jsxSingleQuote: true,
  trailingComma: 'all',
  quoteProps: 'consistent',
  plugins: ['prettier-plugin-tailwindcss', '@trivago/prettier-plugin-sort-imports'],
  importOrder: ['^react$', '^react-dom$', '<THIRD_PARTY_MODULES>', '^[./]'],
};
