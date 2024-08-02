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
          'base-100': '#11111b',
          'base-200': '#1e1e2e',
          'base-300': '#181825',
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
