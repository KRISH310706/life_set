/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        sans: ['Inter', '"DM Sans"', 'sans-serif'],
      },
      colors: {
        green: {
          50: '#f0fdf4', 
          100: '#dcfce7', 
          200: '#bbf7d0',
          300: '#86efac', 
          400: '#4ade80', 
          500: '#22c55e',
          600: '#16a34a', 
          700: '#15803d', 
          800: '#166534', 
          900: '#14532d',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.5s ease both',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-left': 'slideLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-right': 'slideRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-slow': 'pulse 3s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'bounce-slow': 'bounce 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'morph': 'morph 15s ease-in-out infinite',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-15px) rotate(2deg)' },
          '75%': { transform: 'translateY(-5px) rotate(-2deg)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(34, 197, 94, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.1)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(1)' },
        },
        morph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '25%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '50%': { borderRadius: '50% 60% 30% 60% / 30% 60% 70% 40%' },
          '75%': { borderRadius: '60% 40% 60% 30% / 70% 30% 50% 60%' },
        },
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      boxShadow: {
        'green-sm': '0 4px 16px rgba(34, 197, 94, 0.15)',
        'green-md': '0 8px 32px rgba(34, 197, 94, 0.2)',
        'green-lg': '0 20px 60px rgba(34, 197, 94, 0.25)',
        'green-xl': '0 25px 80px rgba(34, 197, 94, 0.3)',
        'inner-green': 'inset 0 2px 10px rgba(34, 197, 94, 0.1)',
        'glow-green': '0 0 40px rgba(34, 197, 94, 0.4)',
        '3d': '0 20px 40px -15px rgba(0, 0, 0, 0.2)',
        '3d-lg': '0 30px 60px -20px rgba(0, 0, 0, 0.25)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 25%, #bbf7d0 50%, #dcfce7 75%, #f0fdf4 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
    },
  },
  plugins: [],
}