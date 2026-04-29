/** @type {import('tailwindcss').Config} */
//
// All `tsua.*` color tokens resolve through CSS variables so the entire
// utility-class palette (`bg-tsua-card`, `text-tsua-text`, `border-tsua-green`,
// `bg-tsua-green/20`, …) automatically swaps when `[data-theme="light"]`
// flips the variables in globals.css. Keep the variable names in sync with
// the `--rgb-*` definitions in globals.css.
//
// Tailwind requires colors used with the alpha modifier (`/20`, `/50`, …)
// to be expressed as `rgb(var(--token) / <alpha-value>)`, where the
// variable holds a *space-separated* RGB triplet, e.g. `15 25 41`.
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        tsua: {
          bg:          'rgb(var(--rgb-bg) / <alpha-value>)',
          'bg-2':      'rgb(var(--rgb-bg2) / <alpha-value>)',
          card:        'rgb(var(--rgb-card) / <alpha-value>)',
          'card-2':    'rgb(var(--rgb-card2) / <alpha-value>)',
          border:      'rgb(var(--rgb-border) / <alpha-value>)',
          'border-2':  'rgb(var(--rgb-border2) / <alpha-value>)',
          green:       'rgb(var(--rgb-accent) / <alpha-value>)',
          'green-2':   'rgb(var(--rgb-accent2) / <alpha-value>)',
          'green-dim': 'rgb(var(--rgb-accent) / 0.08)',
          accent:      'rgb(var(--rgb-accent) / <alpha-value>)',
          'accent-2':  'rgb(var(--rgb-accent2) / <alpha-value>)',
          blue:        'rgb(var(--rgb-blue) / <alpha-value>)',
          'blue-dim':  'rgb(var(--rgb-blue) / 0.08)',
          red:         'rgb(var(--rgb-red) / <alpha-value>)',
          'red-dim':   'rgb(var(--rgb-red) / 0.08)',
          muted:       'rgb(var(--rgb-muted) / <alpha-value>)',
          'muted-2':   'rgb(var(--rgb-muted2) / <alpha-value>)',
          text:        'rgb(var(--rgb-text) / <alpha-value>)',
          'text-2':    'rgb(var(--rgb-text2) / <alpha-value>)',
          gold:        'rgb(var(--rgb-gold) / <alpha-value>)',
        },
      },
      fontFamily: {
        hebrew: ['var(--font-hebrew)', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-card':  'linear-gradient(135deg, rgb(var(--rgb-card)) 0%, rgb(var(--rgb-card2)) 100%)',
        'gradient-green': 'linear-gradient(135deg, rgb(var(--rgb-accent)) 0%, rgb(var(--rgb-accent2)) 100%)',
        'gradient-hero':  'linear-gradient(180deg, rgb(var(--rgb-bg2)) 0%, rgb(var(--rgb-bg)) 100%)',
      },
      boxShadow: {
        'card':         '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgb(var(--rgb-border) / 0.8)',
        'card-hover':   '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgb(var(--rgb-accent) / 0.15)',
        'green-glow':   '0 0 20px rgb(var(--rgb-accent) / 0.15)',
        'green-glow-sm':'0 0 10px rgb(var(--rgb-accent) / 0.10)',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-green': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in':     'fade-in 0.3s ease-out',
        'slide-up':    'slide-up 0.35s ease-out',
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'ticker':      'ticker-scroll 30s linear infinite',
      },
    },
  },
  plugins: [],
};
