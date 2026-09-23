/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Notebook: graph paper, ballpoint, highlighter, red pen
      colors: {
        paper: '#F6F8FC',
        grid: '#D3DEF2',
        pen: {
          DEFAULT: '#1F3BA6',
          soft: '#5A6FB5',
          faint: '#9FB2DE',
        },
        hi: '#F3FF4F',
        redpen: '#E0383E',
        tape: 'rgba(255, 236, 160, 0.8)',
        // Highlighter set for avatars and stickers
        marker: {
          yellow: '#F3FF4F',
          pink: '#FFB8D6',
          green: '#B9F3C9',
          blue: '#C3D8FF',
          orange: '#FFD2A1',
        },
        // Kept for the admin panel, which keeps its original look
        brand: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
      },
      fontFamily: {
        sans: ['"Patrick Hand"', '"Comic Sans MS"', 'system-ui', 'sans-serif'],
        marker: ['"Permanent Marker"', '"Patrick Hand"', 'cursive'],
        // Account and settings screens: same palette, legible type
        plain: ['"Atkinson Hyperlegible"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        draw: {
          '0%': { strokeDashoffset: '340' },
          '100%': { strokeDashoffset: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-6deg)' },
          '50%': { transform: 'rotate(6deg)' },
        },
        unblur: {
          '0%': { filter: 'blur(24px)', transform: 'scale(1.1)' },
          '100%': { filter: 'blur(0)', transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.35s ease-out both',
        'pop-in': 'pop-in 0.45s cubic-bezier(.2,.9,.3,1.3) both',
        draw: 'draw 0.7s ease-in-out 0.25s both',
        wiggle: 'wiggle 0.6s ease-in-out infinite',
        unblur: 'unblur 0.6s ease-out both',
      },
    },
  },
  plugins: [],
}
