/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'monospace'],
      },
      colors: {
        brass: '#D4A574',
        'brass-soft': '#8B6F4E',
        sage: '#8FA87C',
        clay: '#C9583F',
        linen: '#E8E0D1',
      },
    },
  },
  plugins: [],
}
