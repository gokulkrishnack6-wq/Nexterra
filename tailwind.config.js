/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#174D36',
          dark: '#103B2A',
          light: '#216347',
        },
        deep: '#103B2A',
        sage: {
          DEFAULT: '#A8C5A2',
          light: '#E8F0E5',
          dark: '#7A9E73',
        },
        lime: {
          DEFAULT: '#B6D96B',
          hover: '#A5C95A',
        },
        offwhite: '#F7F9F5',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(23, 77, 54, 0.08)',
        'card': '0 2px 12px rgba(16, 59, 42, 0.06)',
        'elevated': '0 10px 30px -4px rgba(16, 59, 42, 0.12)',
      }
    },
  },
  plugins: [],
}

