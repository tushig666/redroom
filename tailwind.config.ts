import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: '#1d1717',
        foreground: '#f5f5f5',
        card: {
          DEFAULT: '#1d1717',
          foreground: '#f5f5f5',
        },
        popover: {
          DEFAULT: '#1d1717',
          foreground: '#f5f5f5',
        },
        primary: {
          DEFAULT: '#b81414',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#2a1f1f',
          foreground: '#f5f5f5',
        },
        muted: {
          DEFAULT: '#2a1f1f',
          foreground: '#6b6b6b',
        },
        accent: {
          DEFAULT: '#ff0000',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ff0000',
          foreground: '#ffffff',
        },
        border: '#3d2a2a',
        input: '#3d2a2a',
        ring: '#b81414',
        chart: {
          '1': '#b81414',
          '2': '#ff0000',
          '3': '#3d2a2a',
          '4': '#1d1717',
          '5': '#6b6b6b',
        },
      },
      borderRadius: {
        lg: '0.2rem',
        md: '0.1rem',
        sm: '0rem',
      },
      keyframes: {
        'visceral-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' },
        },
        'glitch': {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        }
      },
      animation: {
        'visceral-pulse': 'visceral-pulse 4s ease-in-out infinite',
        'glitch': 'glitch 0.2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
