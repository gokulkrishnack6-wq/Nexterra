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
          DEFAULT: '#234B35', // Deep forest green
          dark: '#183B2A',    // Dark green
          light: '#2E5D43',
        },
        sage: {
          DEFAULT: '#A8B89F', // Muted sage
          light: '#DCE5D4',   // Light olive
          subtle: '#EBF0E6',
        },
        olive: '#DCE5D4',
        cream: '#F7F7F0',     // Soft natural cream
        charcoal: {
          DEFAULT: '#292F2A', // Primary body text
          muted: '#777E77',   // Secondary grey text
          light: '#535A54',
        },
        sand: '#EFEFE5',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Manrope', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '14px',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(41, 47, 42, 0.05), 0 1px 2px rgba(41, 47, 42, 0.03)',
        'card': '0 1px 3px rgba(41, 47, 42, 0.06)',
        'dropdown': '0 4px 16px rgba(41, 47, 42, 0.08)',
      }
    },
  },
  plugins: [],
}
