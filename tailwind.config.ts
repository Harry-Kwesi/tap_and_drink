import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        ocean: {
          950: '#020817',
          900: '#0a0f1e',
          800: '#0d1829',
          700: '#0f2236',
          600: '#0c3053',
        },
        water: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        tide: {
          400: '#2dd4bf',
          500: '#14b8a6',
        },
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        fill: {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        wave: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-25%)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-80px)', opacity: '0' },
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // AI Feature keyframes
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 4px 20px rgba(14, 165, 233, 0.35)' },
          '50%': { boxShadow: '0 4px 30px rgba(14, 165, 233, 0.55), 0 0 40px rgba(14, 165, 233, 0.15)' },
        },
      },
      animation: {
        ripple: 'ripple 0.6s ease-out forwards',
        wave: 'wave 3s ease-in-out infinite',
        'float-up': 'float-up 1s ease-out forwards',
        shimmer: 'shimmer 2.5s linear infinite',
        'slide-up-fade': 'slide-up-fade 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
