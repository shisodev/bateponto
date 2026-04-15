/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rose: {
          50:  '#fff1f5',
          100: '#ffe4ec',
          200: '#fecdd9',
          300: '#fda4bc',
          400: '#fb6f97',
          500: '#f43f74',
          600: '#e11d53',
          700: '#be1241',
          800: '#9f1239',
          900: '#881337',
        },
        gold: {
          100: '#fef9ee',
          200: '#fdf0cd',
          300: '#fce095',
          400: '#fbcc55',
          500: '#f9b72a',
          600: '#e89610',
          700: '#c1720d',
          800: '#9a5810',
          900: '#7e4813',
        },
        mauve: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#eda9f5',
          400: '#e279ee',
          500: '#cc4ee3',
          600: '#ad32c4',
          700: '#92279f',
          800: '#782184',
          900: '#63196d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif']
      },
      backgroundImage: {
        'beauty-gradient': 'linear-gradient(135deg, #fdf0cd 0%, #fecdd9 50%, #fae8ff 100%)',
        'rose-gradient': 'linear-gradient(135deg, #f43f74 0%, #be1241 100%)',
        'gold-gradient': 'linear-gradient(135deg, #fce095 0%, #e89610 100%)',
      },
      boxShadow: {
        'beauty': '0 4px 24px rgba(196, 112, 139, 0.15)',
        'beauty-lg': '0 8px 40px rgba(196, 112, 139, 0.25)',
        'card': '0 2px 16px rgba(0,0,0,0.06)',
      }
    }
  },
  plugins: []
}
