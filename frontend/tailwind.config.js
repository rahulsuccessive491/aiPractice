/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand palette — keep tokens semantic so light/dark stays consistent.
        brand: {
          50:  '#eef4ff',
          100: '#dbe6ff',
          200: '#b8ccff',
          300: '#8aa9ff',
          400: '#5d83ff',
          500: '#3a60f5',
          600: '#2546d8',
          700: '#1d36ab',
          800: '#1a2f87',
          900: '#19296b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(15, 23, 42, 0.10)',
      },
    },
  },
  plugins: [],
};
