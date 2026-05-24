/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#07110f',
          900: '#0c1815',
          800: '#11221d',
          700: '#18302a',
        },
        accent: {
          300: '#9ee7d6',
          400: '#68d2ba',
          500: '#2cb191',
          600: '#16876d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 30px 80px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        hero: 'radial-gradient(circle at top left, rgba(44, 177, 145, 0.34), transparent 34%), radial-gradient(circle at top right, rgba(110, 231, 183, 0.18), transparent 28%), linear-gradient(135deg, rgba(7, 17, 15, 0.96), rgba(12, 24, 21, 0.94))',
      },
    },
  },
  plugins: [],
};
