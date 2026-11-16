/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Off-white (fundo)
        cream: '#FFFDF9',
        // Bege
        sand: { 50: '#FAF6F0', 100: '#F3ECE1', 200: '#E7DCCB', 300: '#D6C7B1', 500: '#9A8870', 700: '#6B5D4B' },
        // Rosa antigo (500) e rosa-claro (100/200); 700 é o tom seguro para texto
        rose: { 50: '#FBF3F4', 100: '#F6E3E6', 200: '#EECBD1', 300: '#DDA7B0', 500: '#B76E79', 600: '#9C5662', 700: '#7E4450' },
        // Azul-claro
        sky: { 50: '#F3F8FB', 100: '#E3EEF6', 200: '#C9DDEC', 500: '#6F97B5', 700: '#3E6078' },
        // Amarelo-manteiga
        butter: { 50: '#FEFAEC', 100: '#FBF3D9', 200: '#F6E7B4', 500: '#D9BC5E', 700: '#7A6420' },
        // Tinta (texto)
        ink: { DEFAULT: '#3D3436', muted: '#6E6266', soft: '#8F8386' },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Manrope Variable"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(61,52,54,0.04), 0 4px 16px rgba(61,52,54,0.05)',
        lift: '0 2px 6px rgba(61,52,54,0.06), 0 12px 32px rgba(61,52,54,0.08)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-up': 'fade-up 280ms ease-out both',
        'sheet-in': 'sheet-in 260ms cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
