/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#06090e',
          900: '#0b0f17',
          850: '#101622',
          800: '#161e2e',
          750: '#1c263b',
          700: '#23304a',
        },
        cyber: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          violet: '#7f00ff',
          pink: '#e100ff',
          emerald: '#10b981',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 242, 254, 0.2), 0 0 10px rgba(0, 242, 254, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(0, 242, 254, 0.6), 0 0 25px rgba(127, 0, 255, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
