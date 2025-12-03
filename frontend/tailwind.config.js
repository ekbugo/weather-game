/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hurricane-themed color palette
        'hurricane': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e5fe',
          300: '#7cd1fd',
          400: '#36b9fa',
          500: '#0c9feb',
          600: '#007fc9',
          700: '#0165a3',
          800: '#065586',
          900: '#0b476f',
          950: '#072d4a',
        },
        'storm': {
          50: '#f6f6f7',
          100: '#e2e3e5',
          200: '#c5c6cb',
          300: '#a0a2a9',
          400: '#7b7e87',
          500: '#60636c',
          600: '#4c4e56',
          700: '#3f4047',
          800: '#36373c',
          900: '#303135',
          950: '#1a1b1e',
        }
      }
    },
  },
  plugins: [],
}
