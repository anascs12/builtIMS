/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent:  '#FF4D00',
        'accent-2': '#FF8C5A',
        brand: {
          50:  '#fff2ee',
          100: '#ffe0d6',
          200: '#ffb99e',
          300: '#ff8c5a',
          400: '#ff6130',
          500: '#FF4D00',
          600: '#cc3d00',
          700: '#992e00',
          800: '#661f00',
          900: '#330f00',
        },
        ink: {
          50:  '#f0f0f0',
          100: '#d4d4d4',
          200: '#a8a8a8',
          300: '#787878',
          400: '#525252',
          500: '#363636',
          600: '#242424',
          700: '#181818',
          800: '#111111',
          900: '#0a0a0a',
          950: '#050505',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      animation: {
        'float':      'float 6s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'glow':       'glow 3s ease-in-out infinite alternate',
        'shimmer':    'shimmer 2s linear infinite',
        'fade-up':    'fadeUp 0.5s ease forwards',
        'slide-in':   'slideIn 0.4s ease forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%':   { opacity: '0.4', transform: 'scale(1)' },
          '100%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'glow-sm':  '0 0 20px rgba(255, 77, 0, 0.15)',
        'glow-md':  '0 0 40px rgba(255, 77, 0, 0.2)',
        'glow-lg':  '0 0 80px rgba(255, 77, 0, 0.25)',
        'glass':    '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        'lift':     '0 20px 60px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}