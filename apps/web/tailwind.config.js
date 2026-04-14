/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        tsua: {
          bg:      '#080d1a',
          'bg-2':  '#0d1424',
          card:    '#0f1929',
          'card-2':'#141f30',
          border:  '#1a2840',
          'border-2': '#243550',
          green:   '#00e5b0',
          'green-2':'#00c49a',
          'green-dim': '#00e5b015',
          blue:    '#3b82f6',
          'blue-dim': '#3b82f610',
          red:     '#ff4d6a',
          'red-dim': '#ff4d6a15',
          muted:   '#5a7090',
          'muted-2':'#7a90b0',
          text:    '#e8f0ff',
          'text-2':'#a8bcd4',
          gold:    '#f5b942',
        },
      },
      fontFamily: {
        hebrew: ['var(--font-hebrew)', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(135deg, #0f1929 0%, #0d1828 100%)',
        'gradient-green': 'linear-gradient(135deg, #00e5b0 0%, #00c49a 100%)',
        'gradient-hero': 'linear-gradient(180deg, #0d1424 0%, #080d1a 100%)',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(26,40,64,0.8)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,229,176,0.15)',
        'green-glow': '0 0 20px rgba(0,229,176,0.15)',
        'green-glow-sm': '0 0 10px rgba(0,229,176,0.1)',
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
