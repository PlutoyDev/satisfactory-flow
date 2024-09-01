/** @type {import('prettier').Config} */
module.exports = {
  arrowParens: 'avoid',
  printWidth: 140,
  singleQuote: true,
  jsxSingleQuote: true,
  trailingComma: 'all',
  quoteProps: 'consistent',
  plugins: ['@trivago/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
  importOrder: ['^react$', '^react-dom$', '<THIRD_PARTY_MODULES>', '^[./]'],
};
