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
          900: '#07090E',
          800: '#0E121B',
          700: '#161B26',
          600: '#1F2636',
          500: '#2A3347',
        },
        cnis: {
          red: '#EF4444',
          blue: '#3B82F6',
          emerald: '#10B981',
          amber: '#F59E0B',
          indigo: '#6366F1',
          purple: '#8B5CF6',
          accent: '#06B6D4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
