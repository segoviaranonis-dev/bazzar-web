import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bz: {
          // Legacy (mantener compatibilidad)
          orange:  '#F97316',
          'orange-dark': '#EA580C',
          'orange-light': '#FED7AA',
          navy:    '#1E3A5F',
          'navy-dark': '#132845',
          'navy-light': '#2D5A8E',
          sky:     '#0EA5E9',
          'sky-light': '#E0F2FE',
          cream:   '#FFF8F1',
          // Nueva paleta premium
          black:   '#000000',
          ink:     '#222222',
          mist:    '#888888',
          border:  '#E5E5E5',
          'pink-soft': '#F9E8E8',   // pastel pink para estados secundarios
          'pink-accent': '#E8C4C4',
        },
      },
      fontFamily: {
        sans:  ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      boxShadow: {
        card:        '0 2px 8px 0 rgba(0,0,0,0.06)',
        'card-hover':'0 8px 32px 0 rgba(0,0,0,0.12)',
        drawer:      '-8px 0 40px rgba(0,0,0,0.10)',
        mega:        '0 16px 48px rgba(0,0,0,0.08)',
      },
      scale: { '108': '1.08' },
    },
  },
  plugins: [],
}

export default config
