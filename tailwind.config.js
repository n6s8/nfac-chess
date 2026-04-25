/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        chess: {
          bg: 'rgb(var(--chess-bg) / <alpha-value>)',
          surface: 'rgb(var(--chess-surface) / <alpha-value>)',
          panel: 'rgb(var(--chess-panel) / <alpha-value>)',
          border: 'rgb(var(--chess-border) / <alpha-value>)',
          gold: 'rgb(var(--chess-gold) / <alpha-value>)',
          'gold-dim': 'rgb(var(--chess-gold-dim) / <alpha-value>)',
          blunder: 'rgb(var(--chess-blunder) / <alpha-value>)',
          good: 'rgb(var(--chess-good) / <alpha-value>)',
          hint: 'rgb(var(--chess-hint) / <alpha-value>)',
          text: 'rgb(var(--chess-text) / <alpha-value>)',
          muted: 'rgb(var(--chess-muted) / <alpha-value>)',
          'light-sq': 'rgb(var(--chess-light-sq) / <alpha-value>)',
          'dark-sq': 'rgb(var(--chess-dark-sq) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'Consolas', 'monospace'],
        body: ['"Crimson Pro"', 'Georgia', 'serif'],
      },
      boxShadow: {
        gold: '0 0 20px rgba(232, 184, 75, 0.3)',
        'gold-sm': '0 0 10px rgba(232, 184, 75, 0.2)',
        panel: '0 10px 30px rgba(15, 23, 42, 0.28)',
      },
      animation: {
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(232, 184, 75, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(232, 184, 75, 0.5)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
