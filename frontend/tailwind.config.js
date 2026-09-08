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
        // Light Theme Surface Colors
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        panel: '#F1F5F9',
        border: '#E2E8F0',
        
        // Entity Visual Identities (Consistent across entire app)
        entity: {
          person: '#E11D48',    // Rose/Crimson
          org: '#2563EB',       // Royal Blue
          location: '#059669',  // Emerald Green
          vehicle: '#D97706',   // Amber/Orange
          phone: '#6366F1',     // Indigo
          money: '#7C3AED',     // Violet
          unknown: '#64748B',   // Slate
        },
        
        // Operational Brand Accents
        cnis: {
          primary: '#0284C7',   // Cyan / Sky 600
          accent: '#0891B2',    // Cyan 600
          navy: '#0F172A',      // Slate 900
          slate: '#475569',     // Slate 600
          light: '#F8FAFC',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'panel': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
      }
    },
  },
  plugins: [],
}
