/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch Design Tokens (Nordic Circular Enterprise)
        "surface": "#eefdf0",
        "surface-dim": "#cfded2",
        "surface-bright": "#eefdf0",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#e8f8eb",
        "surface-container": "#e2f2e5",
        "surface-container-high": "#ddece0",
        "surface-container-highest": "#d7e6da",
        "surface-variant": "#d7e6da",
        "on-surface": "#111e17",
        "on-surface-variant": "#404943",
        "inverse-surface": "#26332b",
        "inverse-on-surface": "#e5f5e8",
        "outline": "#717973",
        "outline-variant": "#c0c9c1",
        "surface-tint": "#34684f",
        "primary": "#003522",
        "on-primary": "#ffffff",
        "primary-container": "#174d36",
        "on-primary-container": "#87bd9f",
        "inverse-primary": "#9cd3b4",
        "secondary": "#4b6548",
        "on-secondary": "#ffffff",
        "secondary-container": "#cdebc6",
        "on-secondary-container": "#516b4e",
        "tertiary": "#243300",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#364b00",
        "on-tertiary-container": "#9cbd53",
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "primary-fixed": "#b7efcf",
        "primary-fixed-dim": "#9cd3b4",
        "on-primary-fixed": "#002113",
        "on-primary-fixed-variant": "#1a5039",
        "secondary-fixed": "#cdebc6",
        "secondary-fixed-dim": "#b1ceab",
        "on-secondary-fixed": "#08200a",
        "on-secondary-fixed-variant": "#344d32",
        "tertiary-fixed": "#ccef7e",
        "tertiary-fixed-dim": "#b0d366",
        "on-tertiary-fixed": "#141f00",
        "on-tertiary-fixed-variant": "#384e00",
        "background": "#eefdf0",
        "on-background": "#111e17",

        // Semantic & backward-compatible aliases
        forest: {
          DEFAULT: '#234B35', // Deep forest green
          dark: '#183B2A',    // Dark green
          light: '#2E5D43',
        },
        sage: {
          DEFAULT: '#A8B89F', // Muted sage
          light: '#DCE5D4',   // Light olive
          subtle: '#E6EDE2',
        },
        olive: '#DCE5D4',
        cream: '#F7F7F0',     // Soft natural cream
        charcoal: {
          DEFAULT: '#292F2A', // Primary body text
          muted: '#777E77',   // Secondary grey text
          light: '#414943',
        },
        sand: '#EFEFE5',
        border: '#E1E6DE',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Manrope', 'Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['34px', { lineHeight: '42px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-lg-mobile': ['26px', { lineHeight: '34px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['20px', { lineHeight: '28px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'title-md': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '600' }],
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'gutter': '1.5rem',
        'gutter-mobile': '1rem',
        'margin': '2rem',
        'margin-mobile': '1rem',
      },
      borderRadius: {
        'sm': '0.25rem',
        'DEFAULT': '0.5rem',
        'md': '0.5rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(35, 75, 53, 0.05), 0 1px 2px rgba(35, 75, 53, 0.03)',
        'card': '0 1px 3px rgba(35, 75, 53, 0.05)',
        'dropdown': '0 8px 24px rgba(24, 59, 42, 0.08), 0 2px 6px rgba(24, 59, 42, 0.04)',
        'modal': '0 16px 32px rgba(24, 59, 42, 0.12)',
      }
    },
  },
  plugins: [],
}
