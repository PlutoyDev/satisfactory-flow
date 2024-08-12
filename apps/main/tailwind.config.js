import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['src/**/*.(ts|tsx|js|jsx)', 'index.html'],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        black: {
          // Actually blue-ish black :D
          'base-100': '#202030',
          'base-200': '#101020',
          'base-300': '#000000',
          'base-content': '#cdd6f4',
          'accent': '#fab387',
          'accent-content': '#11111b',
          'success': '#a6e3a1',
          'success-content': '#11111b',
          'warning': '#f9e2af',
          'warning-content': '#11111b',
          'error': '#eba0ac',
          'error-content': '#11111b',
          'info': '#89dceb',
          'info-content': '#11111b',
        },
      },
    ],
  },
};
