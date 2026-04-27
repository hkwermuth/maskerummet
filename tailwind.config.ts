import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx,js,jsx}', './components/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        striq: {
          bg:             '#F8F3EE',
          card:           '#FFFFFF',
          text:           '#302218',
          muted:          '#8C7E74',
          sage:           '#61846D',
          pink:           '#D4ADB6',
          accent:         '#D9BFC3',
          border:         '#E5DDD9',
          link:           '#9B6272',
          footer:         '#E8DADC',
          input:          '#F9F6F0',
          'input-border': '#D0C8BA',
          'src-catalog':  { bg: '#EAF3DE', fg: '#173404' },
          'src-ai':       { bg: '#EEEDFE', fg: '#3C3489' },
          'src-warning':  { bg: '#FAEEDA', fg: '#633806' },
          'src-error':    { bg: '#FCEBEB', fg: '#791F1F' },
        },
        cream:      '#FFFCF7',
        moss:       '#C9E6DA',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:  ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
