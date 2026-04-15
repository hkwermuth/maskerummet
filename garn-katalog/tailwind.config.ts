import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#2C4A3E',
        sand: '#F4EFE6',
        terracotta: '#C16B47',
        stone: '#E8E0D4',
        cream: '#FFFCF7',
        moss: '#C9E6DA',
        bark: '#5A4E42',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
