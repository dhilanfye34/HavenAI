/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        haven: {
          bg: 'var(--haven-bg)',
          surface: 'var(--haven-surface)',
          'surface-hover': 'var(--haven-surface-hover)',
          border: 'var(--haven-border)',
          'border-hover': 'var(--haven-border-hover)',
          text: 'var(--haven-text)',
          'text-secondary': 'var(--haven-text-secondary)',
          'text-tertiary': 'var(--haven-text-tertiary)',
          brand: '#3B82F6',
          'brand-light': '#60A5FA',
          'brand-dark': '#2563EB',
          safe: '#22C55E',
          'safe-light': '#4ADE80',
          'safe-bg': 'var(--haven-safe-bg)',
          danger: '#EF4444',
          'danger-light': '#F87171',
          'danger-bg': 'var(--haven-danger-bg)',
          warning: '#F59E0B',
          'warning-light': '#FBBF24',
          'warning-bg': 'var(--haven-warning-bg)',
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.25s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out forwards',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
